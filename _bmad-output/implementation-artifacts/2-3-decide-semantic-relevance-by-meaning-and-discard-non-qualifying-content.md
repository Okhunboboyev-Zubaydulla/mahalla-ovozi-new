---
baseline_commit: c364589fa44733046c276a97699217671706d320
---

# Story 2.3: Decide Semantic Relevance by Meaning and Discard Non-Qualifying Content

Status: done

<!-- Note: Validation is complete. Story specification has passed adversarial, edge-case, and compliance pre-dev review. -->

## Story

As the **Hokim**,
I want structurally supported Telegram messages to be judged by their meaning rather than by keyword matching,
So that genuinely relevant District signals continue toward Topics while irrelevant group content is discarded.

## Acceptance Criteria

1. **Meaning-Based Analysis & Verbatim Preservation (FR-3):**
   - **Given** a structurally supported candidate from Story 2.2
   - **When** semantic relevance analysis runs
   - **Then** the decision is made through the project-owned AI gateway using meaning analysis
   - **And** the candidate's original text or caption remains verbatim
   - **And** deterministic District, Mahalla, lifecycle, authorization, retention, and Telegram-forwarding rules remain outside AI control.

2. **Guidance-Only Multilingual Vocabulary (FR-3):**
   - **Given** configured District recognition vocabulary contains Uzbek or Russian, Latin or Cyrillic forms, jargon, abbreviations, common typos, or informal terms
   - **When** relevance is evaluated
   - **Then** that vocabulary is supplied only as guidance to semantic analysis
   - **And** presence of a configured term cannot by itself force a candidate to qualify
   - **And** absence of a configured term cannot by itself prevent a candidate from qualifying.

3. **Qualifying Municipal Services (FR-3, FR-9):**
   - **Given** a candidate clearly reports a supported Water (`Сув`), Electricity (`Электр`), Gas (`Газ`), or Waste (`Чиқинди`) situation, complaint, or another qualifying signal
   - **When** its meaning satisfies the approved relevance rules
   - **Then** it receives a completed `relevant` semantic decision
   - **And** it may continue as a relevance-qualified candidate toward same-day Topic assignment (Story 2.4)
   - **And** it is not yet treated as Accepted Evidence or a Topic merely because relevance succeeded.

4. **District Leadership & Hokim Concerns (FR-3):**
   - **Given** a candidate directly and meaningfully concerns the Hokim or District leadership
   - **When** relevance is evaluated
   - **Then** a direct configured Hokim reference or clear semantic leadership reference can qualify
   - **And** a non-service complaint such as a road problem (`yo'llar chuqur`, `asfalt yo'q`), broken streetlights, or drainage issues can qualify for later Hokim-related handling when that connection is clear
   - **And** a vague expression such as “responsible people” (`mas'ullar`) does not qualify merely by implication when no reliable connecting context exists.

5. **Same-Day Mahalla Context Snapshot & Ambiguity Resolution (FR-9, AD-5):**
   - **Given** semantic interpretation requires same-day Mahalla context to resolve an otherwise ambiguous candidate (e.g., *"Bizda ham o'chdi"*)
   - **When** the contextual relevance operation is prepared
   - **Then** its canonical input contains the candidate plus all raw Accepted Evidence from every same-day Topic in that Mahalla
   - **And** evidence is ordered deterministically by original Telegram timestamp (`original_timestamp ASC`), then Telegram message ID (`telegram_message_id ASC`), then internal evidence ID (`id ASC`)
   - **And** RAG, vector retrieval, summaries, recent-message windows, cross-day memory, or top-K selection do not replace that required context
   - **And** required older same-day evidence is never silently truncated.

6. **Self-Contained Reply to Forwarded Parent (FR-2, FR-3):**
   - **Given** a non-forwarded reply to a Telegram-marked forwarded parent passed Story 2.2's structural boundary
   - **When** semantic analysis determines whether that reply can proceed
   - **Then** the reply must contain a sufficiently self-contained qualifying signal
   - **And** the excluded forwarded parent is never supplied as context
   - **And** a reply that depends on the forwarded parent for its meaning is excluded rather than guessed or reconstructed.

7. **Immediate Exclusion & Resident Content Disposal (FR-4, AD-11):**
   - **Given** a candidate is a planned announcement, advertisement, pure speculation, neutral Hokim mention, praise, or other non-qualifying content
   - **When** it contains no independently qualifying reported situation, complaint, or meaningful Hokim-related concern
   - **Then** the completed semantic decision is `irrelevant` (`COMPLETED_IRRELEVANT`)
   - **And** it does not become Accepted Evidence or proceed to Topic processing
   - **And** its resident raw content in memory is discarded immediately after the completed decision
   - **And** the corresponding `telegram_intake_records.raw_payload` in PostgreSQL is sanitized/purged to `{ "status": "EXCLUDED", "purgedAt": "<ISO_TIMESTAMP>" }` while retaining structural headers for non-replay
   - **And** it is not retained for later automatic reconsideration.

8. **Redelivery & Restart Non-Replay (FR-6):**
   - **Given** a candidate is semantically excluded
   - **When** Telegram later redelivers the same message or a worker restarts
   - **Then** the completed decision is not replayed merely because of redelivery or restart
   - **And** discarded raw content is not reconstructed
   - **And** only minimal content-free state required for duplicate/idempotency handling may remain.

9. **Reusable AI Operation Traceability Boundary (FR-13, AD-8):**
   - **Given** a logical semantic-relevance operation is created
   - **When** it is persisted and may invoke an AI provider
   - **Then** it establishes the reusable production AI-operation traceability boundary used by later AI stories (2.4, 2.5, 2.7)
   - **And** receives its own opaque logical-operation identifier (`ai_operation_id`)
   - **And** records its operation type (`SEMANTIC_RELEVANCE`) and authoritative District, Mahalla, day, and subject scope required for investigation
   - **And** pins the exact immutable AI profile/configuration version selected for that logical operation
   - **And** each external provider request receives a distinct provider-attempt identifier linked to that logical operation
   - **And** logical-operation and provider-attempt status is persisted as privacy-safe durable state without raw candidate content, raw Accepted Evidence, complete AI context, provider SDK objects, credentials, or secrets
   - **And** provider calls occur outside database transactions
   - **And** retries of that unfinished logical operation retain the pinned profile
   - **And** later configuration activation does not replay an already-completed historical relevance decision.

10. **Optimistic Concurrency & Stale Snapshot Rejection (FR-9, AD-6):**
    - **Given** contextual relevance analysis captured a Mahalla/day `contextRevision` and snapshot fingerprint
    - **When** Accepted Evidence changes before the AI result can commit
    - **Then** the stale result is rejected as `STALE_SNAPSHOT`
    - **And** no relevance result or other AI-derived state from that stale snapshot is committed
    - **And** only the unfinished candidate may retry against the newest complete deterministic context
    - **And** already-completed historical message decisions are not replayed merely because context advanced.

11. **Explicit AI Failure Handling & Error Taxonomy (FR-13, AD-8):**
    - **Given** the provider refuses, times out, is rate-limited, fails, returns structurally invalid output, returns semantically invalid output, or complete required context exceeds the approved limit
    - **When** semantic relevance processing cannot produce a valid result
    - **Then** the outcome remains an explicit failure rather than being converted to `irrelevant` or `relevant`
    - **And** no partial relevance success is committed
    - **And** the candidate remains only as required for duplicate-safe retry of incomplete work
    - **And** the exact logical operation/profile and privacy-safe failure category remain traceable for later operational investigation.

12. **Privacy-Safe Observability (AD-11, FR-28):**
    - **Given** relevance processing succeeds, excludes content, retries, becomes stale, or fails
    - **When** routine observability data is emitted
    - **Then** metrics/logs/traces can distinguish relevance outcomes, retries, stale snapshots, context size, latency, and sanitized AI failure categories
    - **And** raw Telegram candidate content, complete AI context, bot tokens, credentials, prompts containing resident evidence, and secrets are absent from routine telemetry and Audit History.

13. **Pre-AI and Pre-Commit Double Lifecycle Verification (AD-9):**
    - **Given** semantic relevance work was durably accepted earlier
    - **When** a provider call or authoritative semantic-result commit is about to occur
    - **Then** the current District lifecycle and subject eligibility are rechecked (Gate 1 before AI call, Gate 2 before commit)
    - **And** an ineligible District or subject receives no new AI side effect or semantic business commit
    - **And** previously completed historical decisions remain unchanged.

14. **Empty Initial Context Evaluation (FR-9):**
    - **Given** a contextual relevance operation runs before any Accepted Evidence exists for that Mahalla/day
    - **When** its canonical context is constructed
    - **Then** the complete context consists of the candidate plus the empty Accepted Evidence set (`contextRevision: 0`)
    - **And** a self-contained candidate can still be evaluated normally.

15. **Retry Exhaustion & Safe Terminal Disposal (FR-4, FR-13):**
    - **Given** an incomplete relevance operation has exhausted the retry policy pinned to its logical AI operation or otherwise becomes permanently non-retryable
    - **When** its terminal outcome is recorded
    - **Then** it cannot remain indefinitely pending
    - **And** raw candidate content retained solely for retry is disposed of once no approved processing purpose remains
    - **And** only approved privacy-safe operational lineage may remain.

---

## Tasks / Subtasks

- [x] Task 1: Establish Database Traceability & Immutable Profile Schemas (AC: 9, 12)
  - [x] 1.1 Create Drizzle schema tables `ai_profiles`, `ai_operations`, and `ai_provider_attempts` in `apps/backend/src/adapters/db/schema/ai.ts` with composite index `uniqueIndex('ai_attempts_op_attempt_idx').on(table.operationId, table.attemptNumber)`.
  - [x] 1.2 Export new schemas in `apps/backend/src/adapters/db/schema/index.ts`.
  - [x] 1.3 Generate and apply Drizzle SQL migrations (`pnpm db:generate && pnpm db:migrate`).
  - [x] 1.4 Seed default immutable profile `prof_rel_2026_08_v1` (active by default for `SEMANTIC_RELEVANCE`).

- [x] Task 2: Build Project-Owned AI Gateway & Provider Adapters (AC: 1, 9, 11)
  - [x] 2.1 Implement `AiGatewayPort` and `AiGateway` class in `apps/backend/src/modules/ai/ai-gateway.ts`.
  - [x] 2.2 Implement portable JSON Schema compiler (`compilePortableJsonSchema` & `compileProviderSchema`) in `apps/backend/src/modules/ai/schema-compiler.ts` enforcing strict object closure, required keys for OpenAI/Groq, `nullable: true` adaptation for Gemini REST, and direct object format for Ollama.
  - [x] 2.3 Define `AiGatewayErrorCode` discriminated error taxonomy in `apps/backend/src/modules/ai/types.ts`.
  - [x] 2.4 Implement `MockProviderAdapter` for deterministic unit/integration testing in `apps/backend/src/adapters/ai-providers/mock-provider-adapter.ts`.
  - [x] 2.5 Implement `HttpProviderAdapter` supporting OpenAI, Gemini, Groq, and Ollama/Local REST endpoints in `apps/backend/src/adapters/ai-providers/http-provider-adapter.ts`.

- [x] Task 3: Build Semantic Relevance Evaluator, Context Snapshots & Multilingual Prompts (AC: 1, 2, 3, 4, 5, 6, 7, 14)
  - [x] 3.1 Define `SemanticRelevanceResultSchema` (Zod) in `apps/backend/src/modules/ai/semantic-relevance-contracts.ts` with `.refine()` enforcing cross-field semantic invariants (`is_relevant: true` requires lanes and null exclusion reason; `is_relevant: false` requires empty lanes and non-null exclusion reason).
  - [x] 3.2 Implement `getMahallaDailySnapshot` in `apps/backend/src/modules/ai/context-snapshot.ts` with deterministic ordering (`original_timestamp ASC` $\rightarrow$ `telegram_message_id ASC` $\rightarrow$ `id ASC`), SHA-256 snapshot fingerprinting, and empty context fallback (`contextRevision: 0`).
  - [x] 3.3 Implement `SemanticRelevanceEvaluator` pure domain class in `apps/backend/src/modules/ai/semantic-relevance-evaluator.ts`.
  - [x] 3.4 Implement multilingual system prompt and user prompt assembly with guidance-only vocabulary and deterministic same-day Mahalla context formatting.
  - [x] 3.5 Implement forwarded parent reply isolation (forwarded parent text never passed).
  - [x] 3.6 Implement double validation of model output (JSON parsing syntax check + Zod semantic schema validation).

- [x] Task 4: Configure pg-boss Worker & Downstream Queue Handoff (AC: 1, 3, 7, 8, 9, 10, 13, 15)
  - [x] 4.1 Register `TELEGRAM_TOPIC_ASSIGNMENT_QUEUE` in `apps/backend/src/adapters/jobs/boss-client.ts` with typed `TelegramTopicAssignmentJobData` payload interface and update `initBossQueues`.
  - [x] 4.2 Implement worker consumer for `TELEGRAM_SEMANTIC_RELEVANCE_QUEUE` in `apps/backend/src/entrypoints/worker.ts`.
  - [x] 4.3 Implement Gate 1 (Pre-AI District status check) and Gate 2 (Pre-Commit District status check).
  - [x] 4.4 Implement deterministic same-day Mahalla snapshot retrieval and `contextRevision` capture.
  - [x] 4.5 Execute AI Gateway call outside DB transactions.
  - [x] 4.6 On `is_relevant: true`, atomically commit `ai_operations`, `ai_provider_attempts`, and enqueue `TELEGRAM_TOPIC_ASSIGNMENT_QUEUE` via `withTransactionalIntake`.
  - [x] 4.7 On `is_relevant: false`, atomically commit completed exclusion decision (`ai_operations`), record provider attempt, purge resident text from memory, and sanitize `telegram_intake_records.raw_payload` to `{ "status": "EXCLUDED", "purgedAt": "<ISO_TIMESTAMP>" }` in PostgreSQL.
  - [x] 4.8 On `STALE_SNAPSHOT`, abort commit and trigger safe retry with latest context snapshot.
  - [x] 4.9 Emit privacy-safe structured telemetry logs without raw resident content.

- [x] Task 5: Comprehensive Automated Test Suite (AC: 1–15)
  - [x] 5.1 Create unit tests for `SemanticRelevanceEvaluator` in `apps/backend/tests/semantic-relevance-evaluator.test.ts`.
  - [x] 5.2 Create unit tests for portable schema compilation and error mapping in `apps/backend/tests/ai-gateway.test.ts`.
  - [x] 5.3 Create test helper `createMockAiGateway` in `apps/backend/tests/helpers/mock-ai-gateway.ts`.
  - [x] 5.4 Create worker integration test suite in `apps/backend/tests/worker-semantic-relevance.test.ts` validating all 25 rows of the verification matrix.

### Review Findings

- [x] [Review][Patch] Fix context snapshot lane extraction bug (`relevant_lanes` instead of `lanes`) [apps/backend/src/modules/ai/context-snapshot.ts:96]
- [x] [Review][Patch] Remove PII Telegram User ID from external AI user prompt [apps/backend/src/modules/ai/semantic-relevance-evaluator.ts:84]
- [x] [Review][Patch] Ensure schema compiler OpenAI strict mode compatibility, omit empty required array for Gemini, and handle literal/nativeEnum [apps/backend/src/modules/ai/schema-compiler.ts:80]
- [x] [Review][Patch] Strip markdown code fences before JSON parsing [apps/backend/src/modules/ai/ai-gateway.ts:180]
- [x] [Review][Patch] Harden HTTP Provider Adapter JSON parsing, HTTP 408 timeout, Gemini prompt refusal checks, and error sanitization [apps/backend/src/adapters/ai-providers/http-provider-adapter.ts:223]
- [x] [Review][Patch] Add deterministic orderBy(desc(aiProfiles.version)) in getActiveProfile [apps/backend/src/modules/ai/ai-gateway.ts:81]
- [x] [Review][Patch] Strictly type TelegramTopicAssignmentJobData.relevantLanes with QualifyingLane[] [apps/backend/src/adapters/jobs/boss-client.ts:55]
- [x] [Review][Patch] Capture and persist all provider retry attempts in ai_provider_attempts [apps/backend/src/modules/ai/ai-gateway.ts:168]
- [x] [Review][Defer] Terminal retry exhaustion cleanup hook on permanent job failure [apps/backend/src/entrypoints/worker.ts:524] — deferred, part of queue operational lifecycle in future story

---

## Dev Notes

### Architectural Invariants & Developer Guardrails

1. **Hexagonal Architecture (AD-1):** All AI interactions pass through the project-owned `AiGateway` interface. No domain or worker logic may directly import `@google/genai`, `openai`, or any third-party SDK.
2. **PostgreSQL System of Record & Durable Jobs (AD-3):** Authoritative state (`ai_operations`, `ai_provider_attempts`) and downstream job enqueueing (`TELEGRAM_TOPIC_ASSIGNMENT_QUEUE`) occur atomically within a single PostgreSQL transaction block (`withTransactionalIntake`).
3. **Transaction Boundary (AD-5, AD-8):** Database transactions are kept short. Database connections MUST be released before initiating any AI provider HTTP call.
4. **Deterministic Complete Same-Day Context (AD-5, FR-9):** Context snapshots are assembled strictly scoped by `District + Mahalla + Uzbekistan Calendar Day (Asia/Tashkent)`. Evidence is ordered deterministically:
   $$\text{original\_timestamp ASC} \longrightarrow \text{telegram\_message\_id ASC} \longrightarrow \text{id ASC}$$
   No vector databases, embeddings, top-K selection, rolling summary windows, or silent truncation are permitted.
5. **Optimistic Concurrency & Stale Snapshot Rejection (AD-6):** If new Accepted Evidence is committed to the Mahalla while an AI call is in-flight (incrementing `contextRevision`), the in-flight result is rejected with `STALE_SNAPSHOT` and retried against the latest context.
6. **Immutable AI Profiles & Prospective Activation (AD-8, FR-13):** Every logical operation pins an immutable profile ID (`ai_profiles.id`). Profile activation applies only to future operations; historical completed decisions are never rerun.
7. **Immediate Disposal of Irrelevant Content (FR-4, AD-11):** Messages evaluated as `is_relevant: false` are permanently discarded; memory is purged immediately, and `telegram_intake_records.raw_payload` is sanitized to remove resident text while preserving structural headers for duplicate idempotency.
8. **Privacy-Safe Telemetry (AD-11):** Routine logs, metrics, traces, and audit records MUST NOT contain raw resident message text, captions, user display names, phone numbers, credentials, or bot tokens.

---

### Database Schemas (`apps/backend/src/adapters/db/schema/ai.ts`)

```typescript
import { pgTable, text, timestamp, integer, boolean, numeric, real, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { districts } from './districts.js';

export const aiProfiles = pgTable('ai_profiles', {
  id: text('id').primaryKey(), // e.g. "prof_rel_2026_08_v1"
  version: integer('version').notNull(),
  operationType: text('operation_type').notNull(), // 'SEMANTIC_RELEVANCE' | 'TOPIC_MATCHING' | 'TOPIC_DERIVED_PROJECTION'
  provider: text('provider').notNull(), // 'OPENAI' | 'GEMINI' | 'GROQ' | 'OLLAMA'
  modelId: text('model_id').notNull(), // e.g. "gpt-4o-mini-2024-07-18", "gemini-2.0-flash-001"
  promptVersion: text('prompt_version').notNull(),
  schemaVersion: text('schema_version').notNull(),
  temperature: real('temperature').notNull().default(0.0),
  maxOutputTokens: integer('max_output_tokens').notNull().default(500),
  timeoutMs: integer('timeout_ms').notNull().default(10000),
  retryPolicy: jsonb('retry_policy').notNull(), // { maxAttempts: 3, backoffFactor: 2 }
  capabilities: jsonb('capabilities').notNull(), // { structuredOutputs: true }
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const aiOperations = pgTable('ai_operations', {
  id: text('id').primaryKey(),
  districtId: text('district_id').notNull().references(() => districts.id, { onDelete: 'cascade' }),
  mahallaName: text('mahalla_name').notNull(),
  calendarDay: text('calendar_day').notNull(), // 'YYYY-MM-DD'
  operationType: text('operation_type').notNull(), // 'SEMANTIC_RELEVANCE'
  targetId: text('target_id').notNull(), // intakeId for Story 2.3
  pinnedProfileId: text('pinned_profile_id').notNull().references(() => aiProfiles.id),
  contextRevision: integer('context_revision').notNull().default(0),
  snapshotFingerprint: text('snapshot_fingerprint').notNull(),
  finalStatus: text('final_status').notNull(), // 'COMPLETED_RELEVANT' | 'COMPLETED_IRRELEVANT' | 'FAILED' | 'STALE'
  resultPayload: jsonb('result_payload'), // Sanitized output metadata ({ lanes, exclusionReason, reasoning })
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ai_ops_district_mahalla_day_idx').on(table.districtId, table.mahallaName, table.calendarDay),
  uniqueIndex('ai_ops_district_op_target_idx').on(table.districtId, table.operationType, table.targetId),
]);

export const aiProviderAttempts = pgTable('ai_provider_attempts', {
  id: text('id').primaryKey(),
  operationId: text('operation_id').notNull().references(() => aiOperations.id, { onDelete: 'cascade' }),
  attemptNumber: integer('attempt_number').notNull(),
  provider: text('provider').notNull(),
  modelId: text('model_id').notNull(),
  providerRequestId: text('provider_request_id'),
  durationMs: integer('duration_ms').notNull(),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  cachedTokens: integer('cached_tokens'),
  estimatedCostUsd: numeric('estimated_cost_usd', { precision: 10, scale: 6 }),
  status: text('status').notNull(), // 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'REFUSAL'
  errorCode: text('error_code'), // AiGatewayErrorCode
  sanitizedErrorMessage: text('sanitized_error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ai_attempts_operation_idx').on(table.operationId),
  uniqueIndex('ai_attempts_op_attempt_idx').on(table.operationId, table.attemptNumber),
]);

export type AiProfile = typeof aiProfiles.$inferSelect;
export type AiOperation = typeof aiOperations.$inferSelect;
export type AiProviderAttempt = typeof aiProviderAttempts.$inferSelect;
```

---

### Seed Profile Definition (`prof_rel_2026_08_v1`)

```typescript
export const defaultSemanticRelevanceProfile = {
  id: 'prof_rel_2026_08_v1',
  version: 1,
  operationType: 'SEMANTIC_RELEVANCE',
  provider: 'OPENAI',
  modelId: 'gpt-4o-mini-2024-07-18',
  promptVersion: 'prom_rel_v1',
  schemaVersion: 'sch_rel_v1',
  temperature: 0.0,
  maxOutputTokens: 500,
  timeoutMs: 10000,
  retryPolicy: {
    maxAttempts: 3,
    backoffFactor: 2,
    initialDelayMs: 1000,
  },
  capabilities: {
    structuredOutputs: true,
    jsonSchemaMode: 'strict',
  },
  isActive: true,
};
```

---

### Project-Owned AI Contracts & Types (`modules/ai/types.ts`)

```typescript
import type { ZodType } from 'zod';

export type AiGatewayErrorCode =
  | 'RATE_LIMIT_EXCEEDED'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'INVALID_OUTPUT_SYNTAX'
  | 'INVALID_OUTPUT_SEMANTICS'
  | 'CONTEXT_LIMIT_EXCEEDED'
  | 'PROVIDER_REFUSAL'
  | 'AUTHENTICATION_ERROR'
  | 'STALE_SNAPSHOT';

export interface GenerateStructuredOptions<T> {
  operationType: 'SEMANTIC_RELEVANCE' | 'TOPIC_MATCHING' | 'TOPIC_DERIVED_PROJECTION';
  profileId?: string;
  systemPrompt: string;
  userPrompt: string;
  schema: ZodType<T>;
  schemaName: string;
  deadlineMs?: number;
}

export interface AiGatewayResult<T> {
  data: T;
  profileId: string;
  provider: string;
  modelId: string;
  providerRequestId?: string;
  durationMs: number;
  tokens: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens?: number;
    reasoningTokens?: number;
  };
  estimatedCostUsd: number;
}
```

---

### Semantic Relevance Contracts (`modules/ai/semantic-relevance-contracts.ts`)

```typescript
import { z } from 'zod';

export const QualifyingLaneEnum = z.enum([
  'WATER',
  'ELECTRICITY',
  'GAS',
  'WASTE',
  'HOKIM_RELATED',
]);
export type QualifyingLane = z.infer<typeof QualifyingLaneEnum>;

export const ExclusionReasonEnum = z.enum([
  'PLANNED_ANNOUNCEMENT',
  'ADVERTISEMENT_OR_SPAM',
  'SPECULATION_OR_RUMOR',
  'NEUTRAL_OR_PRAISE',
  'GENERAL_CHATTER',
  'UNRESOLVED_AMBIGUOUS_FRAGMENT',
]);
export type ExclusionReason = z.infer<typeof ExclusionReasonEnum>;

export const SemanticRelevanceResultSchema = z
  .object({
    is_relevant: z.boolean().describe('Whether the message reports a genuine, active citizen issue or Hokim concern'),
    relevant_lanes: z.array(QualifyingLaneEnum).describe('Municipal service or leadership lanes applicable to the issue'),
    exclusion_reason: ExclusionReasonEnum.nullable().describe('Specific exclusion reason if is_relevant is false, otherwise null'),
    reasoning: z.string().max(300).describe('Brief 1-sentence explanation of the decision'),
  })
  .refine(
    (data) => {
      if (data.is_relevant) {
        return data.relevant_lanes.length >= 1 && data.exclusion_reason === null;
      } else {
        return data.relevant_lanes.length === 0 && data.exclusion_reason !== null;
      }
    },
    {
      message:
        'Inconsistent semantic relevance output: is_relevant=true requires at least one lane and null exclusion_reason; is_relevant=false requires empty lanes and non-null exclusion_reason',
    },
  );

export type SemanticRelevanceResult = z.infer<typeof SemanticRelevanceResultSchema>;
```

---

### Downstream Queue Handoff Contract (`adapters/jobs/boss-client.ts`)

```typescript
export const TELEGRAM_TOPIC_ASSIGNMENT_QUEUE = 'telegram-topic-assignment';

export interface TelegramTopicAssignmentJobData {
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
  aiOperationId: string;
  relevantLanes: QualifyingLane[];
  reasoning: string;
}
```

---

### Same-Day Mahalla Context Snapshot Interface (`modules/ai/context-snapshot.ts`)

```typescript
import crypto from 'node:crypto';

export interface AcceptedEvidenceItem {
  id: string;
  topicId: string;
  telegramMessageId: string;
  originalTimestamp: string; // ISO-8601
  verbatimText: string;
}

export interface MahallaDailySnapshot {
  districtId: string;
  mahallaName: string;
  calendarDay: string;
  contextRevision: number;
  snapshotFingerprint: string;
  evidence: AcceptedEvidenceItem[];
}

export function computeSnapshotFingerprint(evidence: AcceptedEvidenceItem[]): string {
  if (evidence.length === 0) {
    return 'sha256_empty_v1';
  }
  const serialized = evidence
    .map((e) => `${e.id}:${e.telegramMessageId}:${e.originalTimestamp}:${e.verbatimText}`)
    .join('|');
  return crypto.createHash('sha256').update(serialized).digest('hex');
}
```

---

### Multilingual System Prompt Template

```markdown
You are the Semantic Relevance Engine for Mahalla Ovozi, an AI platform monitoring neighborhood Telegram groups in Uzbekistan.
Analyze candidate messages and determine whether they represent genuine, active civic problems, service disruptions, or District Leadership (Hokim) concerns.

### LANGUAGE & SCRIPT SUPPORT
Messages may be in Uzbek (Latin or Cyrillic), Russian, or mixed colloquial forms (e.g., "svet o'chdi", "давление паст", "мусор тўлиб кетган"). Evaluate meaning regardless of spelling, script, or slang.

### QUALIFYING LANES
1. WATER (Сув): Tap water outages, low pressure, pipe bursts, sewage leaks/overflows (kanalizatsiya), polluted drinking water.
2. ELECTRICITY (Электр): Power cuts (svet o'chdi/chiroq yo'q), low/high voltage (tok past, 160V), sparking transformers, dangerous fallen wires.
3. GAS (Газ): Gas outages, low gas pressure in winter, leaks, odor of gas.
4. WASTE (Чиқинди): Overflowing garbage containers (musorxona to'lgan), uncollected trash, illegal dumps, animal carcasses.
5. HOKIM_RELATED (Ҳокимга оид): 
   - Direct appeals/complaints to the District Hokim, Hokimiyat, or sector leadership.
   - Non-service public infrastructure issues: broken roads/potholes (yo'llar rasvo, asfalt), broken streetlights, blocked irrigation canals (ariqlar), illegal construction.
   - Overlap: If a resident complains about water and explicitly asks the Hokim to intervene, select both WATER and HOKIM_RELATED.

### STRICT EXCLUSIONS (is_relevant = false)
- PLANNED_ANNOUNCEMENT: Official maintenance notices (e.g., "Ertaga soat 09:00 dan 18:00 gacha ta'mirlash sababli elektr o'chiriladi").
- ADVERTISEMENT_OR_SPAM: Buying, selling, apartment rentals, plumbing/electrician services, course ads.
- SPECULATION_OR_RUMOR: Unconfirmed hearsay, future pricing rumors.
- NEUTRAL_OR_PRAISE: "Rahmat svet yondi", "Hokim keldi", general greetings, prayers.
- GENERAL_CHATTER: Off-topic discussions, jokes, arguments, vague blaming ("mas'ullar qayerga qarayapti").
- UNRESOLVED_AMBIGUOUS_FRAGMENT: Short fragments (e.g., "Bizda ham", "Nega?") that cannot be linked to any same-day Mahalla context.

### CONTEXT & AMBIGUITY RULES
- You are provided with SAME-DAY ACCEPTED EVIDENCE from the same Mahalla (if any exists).
- If the candidate message is a short fragment (e.g., "Bizdayam o'chdi"), check same-day evidence:
  - If evidence shows an active electricity outage today, classify as relevant under ELECTRICITY.
  - If no relevant context exists, classify as is_relevant = false (UNRESOLVED_AMBIGUOUS_FRAGMENT).
- If the candidate is a reply to an excluded/forwarded parent, the parent is NOT provided. The candidate MUST stand on its own meaning. If it cannot, exclude it.

### VOCABULARY GUIDANCE RULE
Configured recognition keywords are guidance-only:
- Keyword presence DOES NOT force relevance (e.g., an ad selling "gaz plita" is still an ADVERTISEMENT).
- Keyword absence DOES NOT prevent relevance (e.g., "Truba yorilib suv ko'chaga oqyapti" is WATER even if "suv ta'minoti" keyword is absent).

### OUTPUT FORMAT
Respond strictly with valid JSON conforming to the requested schema.
```

---

### Comprehensive 25-Row Verification Matrix

| # | Test Scenario | Candidate Message Input | Mahalla Same-Day Evidence Context | Expected Result | Downstream Effect |
| :- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Water Outage (Uzbek Latin)** | `"Bizning 12-uyda suv to'xtab qoldi, bosim umuman yo'q"` | Empty | `is_relevant: true`, Lanes: `['WATER']` | Enqueue Story 2.4 job |
| 2 | **Electricity Blackout (Uzbek Cyrillic)** | `"3 соатдан бери чироқ йўқ, трансформатордан тутун чиқяпти"` | Empty | `is_relevant: true`, Lanes: `['ELECTRICITY']` | Enqueue Story 2.4 job |
| 3 | **Gas Pressure Issue (Russian)** | `"Давление газа упало до нуля, отопление не работает"` | Empty | `is_relevant: true`, Lanes: `['GAS']` | Enqueue Story 2.4 job |
| 4 | **Waste Dump Problem (Colloquial Uzbek)** | `"Musorxona to'lib ketgan, 4 kundan beri moshin kelmadi"` | Empty | `is_relevant: true`, Lanes: `['WASTE']` | Enqueue Story 2.4 job |
| 5 | **Direct Hokim Complaint (Non-Service)** | `"Tuman hokimi qachon 4-ko'chadagi chuqurlarni yamaydi? Moshinalar tushib ketyapti"` | Empty | `is_relevant: true`, Lanes: `['HOKIM_RELATED']` | Enqueue Story 2.4 job |
| 6 | **Service + Hokim Overlap** | `"Ҳоким қачон маҳалладаги сув қувурини тузатади?"` | Empty | `is_relevant: true`, Lanes: `['WATER', 'HOKIM_RELATED']` | Enqueue Story 2.4 job |
| 7 | **Road Problem without Explicit Hokim Mention** | `"Ko'chamizda asfalt qilinmagan, loydan o'tib bo'lmayapti"` | Empty | `is_relevant: true`, Lanes: `['HOKIM_RELATED']` | Enqueue Story 2.4 job |
| 8 | **Vague Official Blaming (Excluded)** | `"Mas'ullar qayerga qarayapti o'zi, nima bo'lyapti?"` | Empty | `is_relevant: false`, `GENERAL_CHATTER` | Sanitize `raw_payload`; no job |
| 9 | **Planned Outage Announcement (Excluded)** | `"Ertaga soat 10:00 dan 16:00 gacha ta'mirlash sababli elektr o'chiriladi"` | Empty | `is_relevant: false`, `PLANNED_ANNOUNCEMENT` | Sanitize `raw_payload`; no job |
| 10 | **Commercial Ad with Keywords (Excluded)** | `"Arzon narxda suv filtrlari va gaz plitalari sotamiz. Tel: 901234567"` | Vocabulary configured for Water/Gas | `is_relevant: false`, `ADVERTISEMENT_OR_SPAM` | Sanitize `raw_payload`; no job |
| 11 | **Rumor & Speculation (Excluded)** | `"Eshitishimcha gaz narxi 2 baravar oshar emish"` | Empty | `is_relevant: false`, `SPECULATION_OR_RUMOR` | Sanitize `raw_payload`; no job |
| 12 | **Gratitude / Neutral Mention (Excluded)** | `"Rahmat, svet yondi, ustalar tez kelishdi"` | Electricity outage evidence exists | `is_relevant: false`, `NEUTRAL_OR_PRAISE` | Sanitize `raw_payload`; no job |
| 13 | **General Chat / Greeting (Excluded)** | `"Assalomu alaykum qo'shnilar, xayrli tong"` | Empty | `is_relevant: false`, `GENERAL_CHATTER` | Sanitize `raw_payload`; no job |
| 14 | **Ambiguous Fragment with Context** | `"Bizda ham o'chdi"` | Earlier today: `[ELECTRICITY] "Svet o'chdi 14-domda"` | `is_relevant: true`, Lanes: `['ELECTRICITY']` | Enqueue Story 2.4 job |
| 15 | **Ambiguous Fragment without Context** | `"Bizdayam shu ahvol"` | Empty (no accepted evidence today) | `is_relevant: false`, `UNRESOLVED_AMBIGUOUS_FRAGMENT` | Sanitize `raw_payload`; no job |
| 16 | **Self-Contained Reply to Forwarded Parent** | `"Bizning 4-domda ham gaz bosimi tushib ketdi"` (Parent was forwarded) | Parent text NOT passed | `is_relevant: true`, Lanes: `['GAS']` | Enqueue Story 2.4 job |
| 17 | **Context-Dependent Reply to Forwarded Parent** | `"Shuni qachon to'g'rilaysizlar?"` (Parent was forwarded) | Parent text NOT passed | `is_relevant: false`, `UNRESOLVED_AMBIGUOUS_FRAGMENT` | Sanitize `raw_payload`; no job |
| 18 | **Guidance Vocabulary Override Prevention** | `"Ko'chada kanalizatsiya toshib ketdi"` (no vocabulary keywords present) | No keywords configured | `is_relevant: true`, Lanes: `['WATER']` | Enqueue Story 2.4 job |
| 19 | **Optimistic CAS Revision Failure (`STALE_SNAPSHOT`)** | In-flight AI call based on revision 1, but new evidence arrived making revision 2 | Revision 2 committed in DB | Rejected with `STALE_SNAPSHOT`, no commit | Worker retries with revision 2 |
| 20 | **Pre-AI Lifecycle Gate 1 Rejection** | Worker de-queues job, but District status is `SUSPENDED` | N/A | Dropped before AI call | No AI request, no cost |
| 21 | **Pre-Commit Lifecycle Gate 2 Rejection** | AI returns relevant result, but District deactivated during call | N/A | Commit aborted | No downstream job, no commit |
| 22 | **Provider Timeout / Rate-Limit (429)** | AI Provider returns HTTP 429 / ETIMEDOUT | N/A | Recorded in `ai_provider_attempts`, job retried | Retried per profile policy |
| 23 | **Invalid Schema / Syntax Output** | Provider returns invalid JSON or schema violation | N/A | Recorded as `INVALID_OUTPUT_SEMANTICS` | Retried up to attempt budget |
| 24 | **Deterministic Context Ordering Check** | Multiple evidence items with different timestamps | Timestamps: 10:00, 09:00, 09:30 | Assembled strictly: 09:00 $\rightarrow$ 09:30 $\rightarrow$ 10:00 | Verified exact prompt order |
| 25 | **Redelivery & Restart Idempotency** | Exact same intake delivery processed twice | Completed `COMPLETED_RELEVANT` in DB | Duplicate skipped via unique constraint | Exactly 1 downstream job |

---

### Project Structure Notes

#### Files to Create:
- `apps/backend/src/adapters/db/schema/ai.ts` — Drizzle schema for `ai_profiles`, `ai_operations`, and `ai_provider_attempts`
- `apps/backend/src/modules/ai/types.ts` — Core TypeScript interfaces and `AiGatewayErrorCode`
- `apps/backend/src/modules/ai/schema-compiler.ts` — Portable strict JSON Schema compiler
- `apps/backend/src/modules/ai/ai-gateway.ts` — Project-owned AI Gateway implementation
- `apps/backend/src/modules/ai/semantic-relevance-contracts.ts` — Zod output schema and types
- `apps/backend/src/modules/ai/context-snapshot.ts` — Same-day Mahalla context snapshot assembler & fingerprint generator
- `apps/backend/src/modules/ai/semantic-relevance-evaluator.ts` — Pure domain relevance evaluator
- `apps/backend/src/adapters/ai-providers/mock-provider-adapter.ts` — Mock adapter for testing
- `apps/backend/src/adapters/ai-providers/http-provider-adapter.ts` — REST adapter for OpenAI/Gemini/Groq/Ollama
- `apps/backend/tests/helpers/mock-ai-gateway.ts` — Mock AI Gateway helper for integration tests
- `apps/backend/tests/ai-gateway.test.ts` — Gateway and schema compiler unit tests
- `apps/backend/tests/semantic-relevance-evaluator.test.ts` — Domain classifier unit tests
- `apps/backend/tests/worker-semantic-relevance.test.ts` — Worker queue integration tests

#### Files to Modify:
- `apps/backend/src/adapters/db/schema/index.ts` — Re-export `ai.ts` tables
- `apps/backend/src/adapters/jobs/boss-client.ts` — Register `TELEGRAM_TOPIC_ASSIGNMENT_QUEUE` and `TelegramTopicAssignmentJobData` interface
- `apps/backend/src/entrypoints/worker.ts` — Implement worker listener for `TELEGRAM_SEMANTIC_RELEVANCE_QUEUE`

---

### References

- [Epic 2 Specification](file:///_bmad-output/planning-artifacts/epics/epic-2.md#Story-2.3)
- [PRD FR-3, FR-4, FR-6, FR-9, FR-13](file:///_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#FR-3)
- [Architecture Spine AD-1, AD-3, AD-5, AD-6, AD-8, AD-9, AD-11](file:///_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md)
- [Provider-Neutral AI Feasibility Research](file:///_bmad-output/planning-artifacts/research/technical-mahalla-ovozi-provider-neutral-ai-feasibility-research-2026-07-27.md)

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

- Pre-dev adversarial and edge-case review completed with subagent research on multi-provider structured outputs (`1c703eb5-c553-411a-b005-1c14c28ca06e`).

### Completion Notes List

- Established full database schema for `ai_profiles`, `ai_operations`, and `ai_provider_attempts` with composite unique constraints and migration `0008_amused_mongoose.sql`.
- Built provider-neutral project-owned AI gateway (`AiGateway`) with `MockProviderAdapter` and native `fetch` `HttpProviderAdapter` supporting OpenAI, Gemini, Groq, and Ollama.
- Implemented portable schema compilation (`compilePortableJsonSchema` and `compileProviderSchema`) supporting `strict: true` schemas for OpenAI/Groq, uppercase OpenAPI schemas for Gemini, and JSON format schemas for Ollama.
- Implemented pure domain `SemanticRelevanceEvaluator` with Zod `.refine()` cross-field validation, multilingual prompt generation, guidance-only vocabulary, and forwarded parent isolation.
- Implemented deterministic same-day Mahalla context snapshot assembler and SHA-256 fingerprint generator with optimistic CAS revision checks (`STALE_SNAPSHOT`).
- Integrated pg-boss worker consumer for `TELEGRAM_SEMANTIC_RELEVANCE_QUEUE` with Gate 1 (Pre-AI) and Gate 2 (Pre-Commit) lifecycle checks, transactional commit via `withTransactionalIntake`, singletonKey enqueue for `TELEGRAM_TOPIC_ASSIGNMENT_QUEUE`, raw text sanitization to `{ status: "EXCLUDED", purgedAt: "..." }` on exclusion, and privacy-safe telemetry (AD-11).
- Implemented complete 25-row verification matrix integration test suite and unit tests; all 303 tests passing across 24 test suites with 100% success rate.

### File List

- `apps/backend/src/adapters/db/schema/ai.ts` (NEW)
- `apps/backend/src/adapters/db/schema/index.ts` (MODIFIED)
- `apps/backend/drizzle/0008_amused_mongoose.sql` (NEW)
- `apps/backend/drizzle/meta/0008_snapshot.json` (NEW)
- `apps/backend/src/modules/ai/types.ts` (NEW)
- `apps/backend/src/modules/ai/schema-compiler.ts` (NEW)
- `apps/backend/src/adapters/ai-providers/mock-provider-adapter.ts` (NEW)
- `apps/backend/src/adapters/ai-providers/http-provider-adapter.ts` (NEW)
- `apps/backend/src/modules/ai/ai-gateway.ts` (NEW)
- `apps/backend/src/modules/ai/semantic-relevance-contracts.ts` (NEW)
- `apps/backend/src/modules/ai/context-snapshot.ts` (NEW)
- `apps/backend/src/modules/ai/semantic-relevance-evaluator.ts` (NEW)
- `apps/backend/src/adapters/jobs/boss-client.ts` (MODIFIED)
- `apps/backend/src/entrypoints/worker.ts` (MODIFIED)
- `apps/backend/tests/helpers/mock-ai-gateway.ts` (NEW)
- `apps/backend/tests/ai-gateway.test.ts` (NEW)
- `apps/backend/tests/semantic-relevance-evaluator.test.ts` (NEW)
- `apps/backend/tests/worker-semantic-relevance.test.ts` (NEW)
- `apps/backend/tests/db-schema.test.ts` (MODIFIED)
- `apps/backend/tests/worker-content-qualification.test.ts` (MODIFIED)
- `apps/backend/vitest.config.ts` (NEW)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED)
- `_bmad-output/implementation-artifacts/2-3-decide-semantic-relevance-by-meaning-and-discard-non-qualifying-content.md` (MODIFIED)

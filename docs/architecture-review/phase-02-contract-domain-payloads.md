# Phase 2 — Contract domain payloads

| Field | Value |
|---|---|
| Phase | L1-P02 |
| Layer | L1 Contracts |
| Owner | main session |
| Status | **complete** |
| ADR lens | 0003 (same-day calendar boundary) |
| Scope | `topics.ts`, `signals.ts`, `issues.ts`, `districts.ts`, `hokim-accounts.ts`, `telegram-groups.ts`, `telegram-bot.ts`, `audit.ts` |
| Question | Do domain payloads describe the domain, or leak persistence/transport shape? |
| Findings | 0 blocker · 1 high · 5 medium · 0 low |

## Phase question and method

Read all eight payload modules at interface level, then trace every exported symbol to production call sites. Checked specifically for persistence leakage (DB column names, snake_case, drizzle types), transport leakage (HTTP-shaped or SDK-shaped fields), and internal inconsistency in how the same domain concept is typed.

**Persistence-leakage result: clean.** A targeted search for `snake_case`, `_id`, `DbRow`, `RawRow`, `drizzle`, and raw SQL across `packages/api-contracts/src` returned **zero matches**. The contract package is genuinely browser-safe in that respect — no database row shape crosses this seam. That is a real, verified strength and it narrows the question to domain fidelity.

## Findings

### L1-P02-01 — Sentinel UI text and its predicate live in the contract package

| Field | Value |
|---|---|
| Category | `leaky-seam` |
| Severity | **high** |
| Strength | `strong` |
| Confidence | high |
| Verification | `observed` |
| Location | `packages/api-contracts/src/topics.ts:27-31` |

**Description.** A user-facing Uzbek string and a function that tests for it are exported from the browser-safe contract package. Presentation copy is baked into the wire contract.

**Verbatim evidence.**

```
// packages/api-contracts/src/topics.ts:27-31
export const PENDING_TOPIC_SUMMARY_TEXT = 'Мавзу хулосаси тайёрланмоқда...';

export function isTopicSummaryPending(summary: string): boolean {
  return summary === PENDING_TOPIC_SUMMARY_TEXT;
}
```

**Why it matters.** This encodes a *presentation* state as a *data* sentinel. The backend writes a specific Uzbek sentence into the `summary` column as a marker meaning "not ready"; the contract package must then export that literal so the UI can recognise it. Three consequences: (1) the sentinel is not distinguishable from a legitimate summary that happens to read the same way — there is no separate flag; (2) changing the UI copy changes the stored data contract, and any already-persisted row keeps the old literal; (3) the contract package, whose stated purpose is wire shapes, now owns a translated string, so the seam between "what the data is" and "how it is displayed" has dissolved.

**Deletion test.** **SURVIVES.** Deleting the constant and predicate would force complexity back into consumers: every reader of `summary` would need its own copy of the literal, and they would drift. The right fix is not deletion but *relocation of the concept* — a boolean or status field, with the copy living in the UI layer.

**Fix direction.** Represent pending state explicitly on the payload (e.g. a status field or a nullable summary where `null` means pending) and move the display string into the web application. The contract should carry data, not prose.

**Acceptance criteria.** (1) No user-facing copy is exported from `packages/api-contracts`. (2) Pending state is representable without comparing against a sentinel string. (3) Changing UI copy cannot alter persisted data.

---

### L1-P02-02 — Canonical schemas are bypassed within the contract layer itself

| Field | Value |
|---|---|
| Category | `hidden-dependency`, `adr-conflict` |
| Severity | medium |
| Strength | `strong` |
| Confidence | high |
| Verification | `observed` |
| Location | `packages/api-contracts/src/topics.ts:37,258,373`; `packages/api-contracts/src/signals.ts:15` |

**Description.** The layer that *defines* the canonical `IsoDateStringSchema` and `DistrictIdSchema` does not consistently use them. Two payloads in `signals.ts` use the canonical district/date schemas while the equivalent fields in `topics.ts` hand-roll `z.string()`.

**Verbatim evidence.**

```
// packages/api-contracts/src/topics.ts:35,37  — hand-rolled
districtId: DistrictIdSchema,
calendarDay: z.string(),
```

```
// packages/api-contracts/src/topics.ts:258,373  — hand-rolled calendarDay
calendarDay: z.string(),
```

Contrast the sibling payload module:

```
// packages/api-contracts/src/signals.ts:15,18  — canonical schemas
  districtId: z.string().min(1),
  calendarDay: IsoDateStringSchema,
```

and `topics.ts:256,371,388`, which *do* use `districtId: DistrictIdSchema`.

**Why it matters.** `calendarDay` in `topics.ts:37,258,373` is typed as an unconstrained string, so the contract permits any text there — including a value that violates ADR-0003's same-day calendar rule. Meanwhile `signals.ts:18` enforces the format. Two payloads describing the same calendar concept validate differently. Conversely `signals.ts:15` hand-rolls `z.string().min(1)` where `DistrictIdSchema` exists and is used elsewhere.

> ADR-0003 is in this phase's lens. The finding is filed as `hidden-dependency` plus `adr-conflict` because the unconstrained `calendarDay` is precisely where the ADR's boundary can be silently violated at the contract level. The deeper tenant-scoping question (ADR-0006) is **not** filed here — it belongs to L6.

**Deletion test.** Replacing the hand-rolled fields with the canonical schemas removes duplication rather than moving it — the canonical schema is already imported by `topics.ts:2`.

**Fix direction.** Use `IsoDateStringSchema` for every `calendarDay` and `DistrictIdSchema` for every `districtId` in the package. If a genuinely unconstrained string field is needed, name it to say so.

**Acceptance criteria.** (1) Every calendar-day field in the contract package validates via `IsoDateStringSchema`. (2) Every district identifier validates via `DistrictIdSchema`. (3) No payload field named `calendarDay` accepts a non-date string.

---

### L1-P02-03 — Four exported symbols have zero consumers, including two that duplicate existing types

| Field | Value |
|---|---|
| Category | `shallow-module`, `duplication` |
| Severity | medium |
| Strength | `strong` |
| Confidence | high |
| Verification | `observed` |
| Location | `packages/api-contracts/src/topics.ts:13-14,399-400`; `packages/api-contracts/src/common.ts:21-22` |

**Description.** The package exports four symbols with no production call site. Two are pure aliases of types that already exist under another name, and one alias pair renames a response type for a surface that already has the original.

**Verbatim evidence.**

```
// packages/api-contracts/src/topics.ts:13-14
export const TopicPrimaryLaneSchema = QualifyingLaneSchema;
export type TopicPrimaryLane = QualifyingLane;
```

```
// packages/api-contracts/src/topics.ts:399-400
export const DistrictMahallasResponseSchema = HokimMahallasResponseSchema;
export type DistrictMahallasResponse = HokimMahallasResponse;
```

```
// packages/api-contracts/src/common.ts:21-22
export const OptionalDistrictIdSchema = z.string().trim().min(1).optional();
export type OptionalDistrictId = z.infer<typeof OptionalDistrictIdSchema>;
```

**Consumer evidence (verified by grep across the workspace).**

- `TopicPrimaryLaneSchema` / `TopicPrimaryLane` — only matches are the definition lines. **Zero consumers.**
- `OptionalDistrictIdSchema` / `OptionalDistrictId` — only matches are `common.ts:21,22`. **Zero consumers.**
- `DistrictMahallasResponseSchema` / `DistrictMahallasResponse` — consumed at `apps/web/src/topics/district-topics-client.ts:6,7,63,64,70,133`. **Genuinely used** — but as a rename of a type that already exists, which is the duplication rather than dead code.

**Why it matters.** `TopicPrimaryLane` is an exact alias of `QualifyingLane`; having two names for one concept means a reader must determine whether they are actually the same, and future divergence between them would be silent. `OptionalDistrictId` is unreferenced entirely. `DistrictMahallasResponse` is used, but it is the same schema object as `HokimMahallasResponse` under a different name — so the two API surfaces are coupled by identity: changing one silently changes the other, while the names imply they are independent contracts.

**Deletion test.** **SURVIVES for the two zero-consumer pairs** — deleting them removes surface without moving any complexity. For the `DistrictMahallas` alias the deletion test is more nuanced: the alias is *used*, so deleting it means callers use `HokimMahallasResponse`, which is honest but reads oddly on a district surface. The underlying issue is that one schema is serving two named endpoints.

**Fix direction.** Delete `TopicPrimaryLane` / `TopicPrimaryLaneSchema` and `OptionalDistrictId` / `OptionalDistrictIdSchema`. For the mahallas pair, either declare one shared name and use it on both surfaces, or give the district surface its own schema if the two are intended to diverge.

**Acceptance criteria.** (1) No exported symbol is an unreferenced alias of another exported symbol. (2) Every export has at least one production consumer. (3) Two API surfaces that share a schema do so under one name, or have independent schemas.

---

### L1-P02-04 — Schema aliasing is used as a substitute for semantic distinction across the layer

| Field | Value |
|---|---|
| Category | `duplication`, `leaky-seam` |
| Severity | medium |
| Strength | `worth-exploring` |
| Confidence | high |
| Verification | `observed` |
| Location | `packages/api-contracts/src/{auth.ts:44,subscriptions.ts:16,131,audit.ts:69,topics.ts:211}` |

**Description.** At least six exported schemas are direct aliases of a schema defined elsewhere, several with an explicit comment justifying the alias as "semantic distinction" — but an alias provides no type-level distinction in Zod or TypeScript.

**Verbatim evidence.**

```
// packages/api-contracts/src/auth.ts:38-45
/**
 * Session verification response contract.
 * Both sign-in and session verification return identical actor context and session info.
 * SessionResponseSchema aliases SignInResponseSchema to maintain semantic distinction
 * for endpoint consumers without duplicating schema definitions.
 */
export const SessionResponseSchema = SignInResponseSchema;
```

```
// packages/api-contracts/src/subscriptions.ts:129-131
/**
 * Aliases DistrictActivationBlockedErrorEnvelopeSchema from districts.ts for contract alignment.
 */
export const DistrictNotReadyErrorEnvelopeSchema = DistrictActivationBlockedErrorEnvelopeSchema;
```

```
// packages/api-contracts/src/subscriptions.ts:16
export const SubscriptionStatusSchema = DistrictStatusSchema;
```

```
// packages/api-contracts/src/audit.ts:69
export const AuditEventDetailSchema = AuditHistoryItemSchema;
```

```
// packages/api-contracts/src/topics.ts:211
export const HokimTopicStatisticsQuerySchema = TopicBaseFilterSchema;
```

**Why it matters.** The stated goal — semantic distinction without duplicating definitions — is not achieved by aliasing in Zod. `SessionResponseSchema` and `SignInResponseSchema` are the *same object*; a future change to one changes both, and nothing in the type system prevents that. The aliases create an impression of independent contracts where only one exists. Note also that `SubscriptionStatusSchema = DistrictStatusSchema` means a district's lifecycle status and a subscription's status are the same enum, which may or may not be intended — the alias hides the question.

**Deletion test.** Not a clean survivor: these aliases *are* consumed (`SessionResponseSchema` at `apps/web/src/auth/auth-client.ts:9,46` and `apps/backend/tests/auth-lifecycle.test.ts:8,219`; `AuditEventDetailSchema` at `apps/web/src/api/audit-client.ts:4,71`; `SubscriptionStatusSchema` at `apps/backend/src/modules/subscriptions/subscriptions-service.ts:15,109`; `DistrictMahallasResponseSchema` at `district-topics-client.ts`). Retained as `worth-exploring` because the friction is documentation-grade: a reader must chase each alias to learn what it really is.

**Fix direction.** Where two surfaces genuinely share a shape, export one schema under one name and let both surfaces import it. Where they are meant to be able to diverge, give each its own `z.object({...})` — or a branded type — so divergence is possible and visible.

**Acceptance criteria.** (1) A shared payload shape has exactly one exported name. (2) No comment claims a semantic distinction that the type system does not enforce. (3) Any two concepts sharing one schema do so deliberately and the sharing is documented as a constraint, not a coincidence.

---

### L1-P02-05 — `SignalDetailSchema` carries untyped records and money as a string

| Field | Value |
|---|---|
| Category | `untestable-interface`, `leaky-seam` |
| Severity | medium |
| Strength | `worth-exploring` |
| Confidence | high |
| Verification | `observed` |
| Location | `packages/api-contracts/src/signals.ts:61-72` |

**Description.** The signal-detail contract exposes four untyped escape hatches and represents a currency amount as a string, so the strongest-typed layer in the codebase carries fields nothing can validate.

**Verbatim evidence.**

```
// packages/api-contracts/src/signals.ts:61-72
export const SignalDetailSchema = z.object({
  signal: SignalMessageListItemSchema,
  telegramChatId: z.string().optional(),
  telegramMessageId: z.string().optional(),
  telegramUserId: z.string().nullable().optional(),
  userMetadata: z.record(z.unknown()).nullable().optional(),
  replyMetadata: z.record(z.unknown()).nullable().optional(),
  durationMs: z.number().int().nullable().optional(),
  inputTokens: z.number().int().nullable().optional(),
  outputTokens: z.number().int().nullable().optional(),
  estimatedCostUsd: z.string().nullable().optional(),
});
```

**Why it matters.** Three separate issues. (1) `z.record(z.unknown())` for `userMetadata` and `replyMetadata` accepts any object — the schema cannot reject a malformed payload, and consumers receive `unknown` they must narrow by hand. This directly parallels the `TelegramReplyMetadataSchema` that *does* exist at `topics.ts:16-22` with typed fields (`replyToMessageId`, `replyToUserId`, `replyToIsForwarded`, `replyToIsBot`) — so a typed shape for reply metadata is already defined and simply not used here. (2) `estimatedCostUsd` as a string means arithmetic requires parsing, and the precision/format is unspecified. (3) `telegramChatId`/`telegramMessageId` are transport identifiers surfaced on a *domain* detail payload — the Telegram SDK shape is visible through the contract.

**Deletion test.** Not applicable to field typing; the module is consumed (the signal-inspection UI). Retained as `worth-exploring`.

**Fix direction.** Use the existing `TelegramReplyMetadataSchema` for `replyMetadata`. Replace `z.record(z.unknown())` with typed schemas or drop the fields if nothing consumes them. Represent currency as a number or a documented decimal string with a fixed scale.

**Acceptance criteria.** (1) No `z.record(z.unknown())` remains in a contract payload without a documented reason. (2) `replyMetadata` validates against the existing typed schema. (3) Monetary values have a specified representation.

---

### L1-P02-06 — `ListSignalsQuerySchema` re-declares pagination fields instead of composing the shared pagination schema

| Field | Value |
|---|---|
| Category | `duplication` |
| Severity | medium |
| Strength | `worth-exploring` |
| Confidence | high |
| Verification | `observed` |
| Location | `packages/api-contracts/src/signals.ts:36-55`; contrast `packages/api-contracts/src/pagination.ts:13-17` |

**Description.** The signals list query hand-writes `cursor`, `limit`, and `direction` — the exact three fields of the shared `CursorPaginationQuerySchema` — but with different bounds.

**Verbatim evidence.**

```
// packages/api-contracts/src/pagination.ts:13-17 — the shared schema
export const CursorPaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().min(1).optional(),
  direction: z.enum(['forward', 'backward']).default('forward'),
});
```

```
// packages/api-contracts/src/signals.ts:52-54 — re-declared inline
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  direction: z.enum(['forward', 'backward']).default('forward'),
```

Contrast `topics.ts:161-164`, which declares its own `cursorPaginationFields` with a **different** limit ceiling:

```
const cursorPaginationFields = {
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
```

**Why it matters.** Three pagination declarations now exist with three different behaviours: the shared schema (max 200, default 50, has `direction`, cursor requires min length 1), the inline signals copy (identical to shared, so pure duplication), and the topics copy (max 100, default 20, no `direction`, cursor may be empty string). The topics variant is the interesting one: `cursor: z.string().optional()` without `.min(1)` accepts `?cursor=`, which then reaches the decoder as an empty string — and `decodeKeysetCursor` treats `''` as falsy and returns `null` (`pagination.ts:84`), so an empty cursor silently means "first page" rather than being rejected. Whether that is intended is unrecorded.

**Deletion test.** Composing the shared schema instead of re-declaring would concentrate the pagination contract at one seam — the duplication dissolves.

**Fix direction.** Compose `CursorPaginationQuerySchema` (or explicitly document why a surface deviates). If the topics limit ceiling of 100 is deliberate, express it as a named constant rather than a second inline declaration.

**Acceptance criteria.** (1) Pagination fields are declared once and composed. (2) Every deviation from the shared bounds is deliberate and documented. (3) An empty cursor string is either rejected or explicitly documented as meaning "first page".

## Residual uncertainty

- **Whether `SubscriptionStatusSchema = DistrictStatusSchema` is intended** (L1-P02-04) — the alias makes a district lifecycle status and a subscription status the same enum. Reading alone cannot tell whether these concepts are meant to be coupled. Status: `unverified-risk`.
- **Whether the unconstrained `calendarDay` fields are load-bearing** (L1-P02-02) — the fields are on *response* payloads, so the backend is the producer. Whether the backend can actually emit a malformed value depends on the write path, which is P3's and L3's territory.
- **`TopicPrimaryLane`'s intent** (L1-P02-03) — the name suggests a future distinction between a topic's primary lane and its full lane set, and `TopicCardItemSchema` does carry both `primaryLane` and `lanes`. The alias may be a placeholder for a distinction never implemented. Not resolvable statically.
- **Coverage note.** `issues.ts`, `districts.ts`, `hokim-accounts.ts`, `telegram-groups.ts`, and `telegram-bot.ts` were read at interface level and produced no finding beyond the alias pattern already captured in L1-P02-04. `districts.ts:171` defines `DistrictActivationBlockedErrorEnvelopeSchema`, the documented exception to the standard error envelope in `common.ts:25-28` — recorded as consistent with its stated exception, not filed as a finding.

## Cross-references for later phases

- **P3** should check whether `topic-query-engine.ts` emits the unconstrained `calendarDay` values that L1-P02-02 permits, and whether the `cursor: z.string().optional()` permissiveness in `topics.ts:162` is reachable from `hokim-topics-routes.ts`.
- **P4** owns the `PENDING_TOPIC_SUMMARY_TEXT` sentinel's *writer* (L1-P02-01) — locating where the backend persists that literal, and whether a status field already exists that could replace it.
- **L6** owns the ADR-0006 assessment deferred from L1-P02-02, and any decision about transport identifiers (`telegramChatId`, `telegramMessageId`) on domain payloads.

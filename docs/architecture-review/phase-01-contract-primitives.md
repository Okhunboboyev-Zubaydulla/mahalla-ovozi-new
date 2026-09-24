# Phase 1 — Contract primitives

| Field | Value |
|---|---|
| Phase | L1-P01 |
| Layer | L1 Contracts |
| Owner | main session |
| Status | **complete** |
| ADR lens | 0003 (same-day calendar boundary) |
| Scope | `packages/api-contracts/src/{common,pagination,timezone,auth,index}.ts` |
| Question | Are the shared primitives deep enough for every consumer? |
| Findings | 0 blocker · 2 high · 4 medium · 0 low |

## Phase question and method

L1 is the seam every other layer crosses. This phase asks whether the *primitives* — the schemas and helpers all three packages import — carry their weight, or whether they are thin wrappers that push complexity onto callers.

Method: read all five files at interface level, then trace every exported symbol to its production call sites (`grep` across `apps/` and `packages/`, excluding tests). Each suspected shallow module was put through the deletion test. Per the ADR ownership rule, ADR-0006 (tenant scoping) implications are **noted but deferred to L6** — no `tenant-isolation` finding is filed here.

## Findings

### L1-P01-01 — `ActorContext` is declared four times with divergent nullability

| Field | Value |
|---|---|
| Category | `duplication`, `hidden-dependency` |
| Severity | **high** |
| Strength | `strong` |
| Confidence | high |
| Verification | `observed` |
| Location | `packages/api-contracts/src/auth.ts:6-12`; `apps/backend/src/modules/topics/topic-query-engine.ts:181-185`; `apps/backend/src/modules/districts/district-onboarding-engine.ts:62`; `apps/backend/src/modules/hokim-accounts/hokim-accounts-service.ts:61` |

**Description.** The same domain concept — the acting principal — has four independent TypeScript declarations. The contract version and the query-engine version disagree on a load-bearing field.

**Verbatim evidence.**

```
// packages/api-contracts/src/auth.ts:6-12
export const ActorContextSchema = z.object({
  id: z.string().min(1),
  role: ActorRoleSchema,
  username: z.string().min(1),
  districtId: z.string().nullable().optional(),
  mustChangePassword: z.boolean().optional(),
});
```

```
// apps/backend/src/modules/topics/topic-query-engine.ts:181-185
export interface ActorContext {
  id: string;
  districtId: string;
  role: string;
}
```

Also declared at `apps/backend/src/modules/districts/district-onboarding-engine.ts:62` and `apps/backend/src/modules/hokim-accounts/hokim-accounts-service.ts:61`.

**Why it matters.** `districtId` is `nullable().optional()` in the contract but **required and non-null** in the query engine. The two shapes are structurally incompatible: a `Product Owner` actor (whose `districtId` is legitimately null) satisfies the contract type but not the query-engine type. Nothing forces the four declarations to stay in step — a change to one silently diverges from the other three, and the compiler cannot flag it because they are separate nominal declarations.

**Deletion test.** Delete any one declaration and complexity does **not** vanish — it reappears at every call site that needs the other shape. This is a real duplication, not a pass-through: the four declarations encode *different* contracts for one concept, which is precisely the friction.

**Fix direction.** Declare `ActorContext` once in the contract package. If the query engine genuinely needs a non-null `districtId`, express that as a distinct, named narrowing type derived from the contract type (e.g. a `DistrictScopedActor` produced by an explicit guard function), so the requirement is enforced at one seam instead of re-declared.

**Acceptance criteria.** (1) Exactly one declaration of the actor concept exists in `packages/api-contracts`. (2) The query engine's non-null requirement is expressed as a derived type or a validating guard, not a second interface. (3) A change to the actor shape produces a compile error at every affected call site.

> ADR-0006 note: the nullability of `districtId` is a tenant-scoping question. Filed here as duplication only; the scoping implication is **L6's** to assess.

---

### L1-P01-02 — `ApiErrorEnvelopeSchema` has no backend producers · **[FIXED — session 7]**

| Field | Value |
|---|---|
| Category | `leaky-seam`, `untestable-interface` |
| Severity | **high** |
| Strength | `strong` |
| Confidence | high |
| Verification | `observed` |

> **Session 7 correction — the core claim held; three details and the fix direction did not.**
> **Measured:** **199** literal `error: {` sites in `apps/backend/src`, not "250+".
> **Wrong:** the backend was not purely hand-written — `entrypoints/http.ts:154-244` (`setErrorHandler`) and `:246-253` (`setNotFoundHandler`) were already centralised producers that lifted `blockers`/`details`/`validationErrors` programmatically.
> **Wrong:** the stated mechanism ("a route that emits `{ error: { message } }` without `code` passes the backend build") had **0 live offenders** — every `error: {` block carries a `code`.
> **Missed:** the real live defect. `common.ts:43` types `blockers` as `z.array(z.record(z.unknown()))`, so the generic schema validates nothing about blocker structure, while `apps/web/src/lib/api-client.ts:75` cast the result to `PrerequisiteItem[]` against a producer (`districts-routes.ts:227`) that emits real `PrerequisiteItem[]`.
> **Deletion test re-run: the schema SURVIVES.** `api-client.ts:68` is a live production consumer the entire web error path depends on. Deleting it would move the parse and the shape knowledge into the client and remove the only validation of server-originated errors. The finding's "give the backend one error-serialising function" direction was right; its framing ("the schema is dead / delete it") was the wrong branch.
>
> **Fixed:** new gate `apps/backend/src/modules/errors/api-error-envelope.ts` — `serializeApiError(error)` and `serializeNotFoundError()`, each returning `{ statusCode, body }` where `body` has passed `ApiErrorEnvelopeSchema.parse`. Both `http.ts` producers now route through it. AC(1) and AC(2) met. The client cast is replaced by carve-out validation (`api-client.ts:19-28`).
>
> **AC(3) is PARTIAL and stated as such.** The 199 literals still bypass the gate — filed, not fixed (see `fix-backlog.md` item 11). Full record: `fix-ledger.md` Phase 11.
| Location | `packages/api-contracts/src/common.ts:37-46`; consumed at `apps/web/src/lib/api-client.ts:1,68` |

**Description.** The error envelope is a contract the browser *parses* but the backend never *produces* through the schema. Every backend route hand-writes the envelope as an object literal, so the contract cannot fail on the producing side.

**Verbatim evidence.**

```
// packages/api-contracts/src/common.ts:37-46
export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    statusCode: z.number().int().min(400).max(599).optional(),
    details: z.record(z.unknown()).optional(),
    blockers: z.array(z.record(z.unknown())).optional(),
    validationErrors: z.array(ApiValidationErrorItemSchema).optional(),
  }),
});
```

```
// apps/web/src/lib/api-client.ts:68
const errorParsed = ApiErrorEnvelopeSchema.safeParse(body);
```

Representative hand-written backend envelopes (of 250+ literal `error: { ... }` sites across `apps/backend/src`):

```
// apps/backend/src/modules/auth/auth-routes.ts:96
return reply.status(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Сессия топилмади ёки муддати тугаган.' } });
```

```
// apps/backend/src/modules/districts/districts-routes.ts:79
error: { code: 'VALIDATION_ERROR', message: 'Туман идентификатори талаб қилинади.' },
```

**Why it matters.** The seam is one-directional in enforcement. The browser validates incoming errors against the schema; the backend only asserts compliance by hand. A route that emits `{ error: { message } }` without `code` — which the schema forbids — passes the backend build and surfaces to the client as a parse failure rather than a compile error. The contract's interface therefore does not actually bind its producers.

**Deletion test.** Deleting `ApiErrorEnvelopeSchema` would not remove complexity — it would move the client-side parse failure *and* the shape knowledge into `api-client.ts`, and every route's literal would still need to agree. The schema earns its keep; the gap is that the backend bypasses it.

**Fix direction.** Give the backend one error-serialising function whose return type is the parsed envelope type, and route error responses through it, so the schema becomes the single producer-side gate. The 250+ literals then collapse into calls at that one seam.

**Acceptance criteria.** (1) A single backend function constructs error envelopes and its signature is typed by the contract. (2) Its output is validated by `ApiErrorEnvelopeSchema` before being sent. (3) A malformed envelope is impossible to send without a compile error or a failed validation.

---

### L1-P01-03 — `timezone.ts` is a shallow module; two of three exports have zero production consumers

| Field | Value |
|---|---|
| Category | `shallow-module` |
| Severity | medium |
| Strength | `strong` |
| Confidence | high |
| Verification | `observed` |
| Location | `packages/api-contracts/src/timezone.ts:1-33` |

**Description.** The module's interface is nearly as wide as its implementation. `getTashkentToday` is a verbatim pass-through, and two of the three exported symbols have no production call site — only re-exports and the module's own test.

**Verbatim evidence.**

```
// packages/api-contracts/src/timezone.ts:28-33
/**
 * Convenience helper returning the current calendar day string (YYYY-MM-DD) in Asia/Tashkent.
 */
export function getTashkentToday(referenceDate?: Date): string {
  return getTashkentCalendarDay(referenceDate);
}
```

```
// packages/api-contracts/src/timezone.ts:1-2
export const TASHKENT_OFFSET_SECONDS = 5 * 3600; // +05:00 (18,000s)
export const TASHKENT_OFFSET_MS = TASHKENT_OFFSET_SECONDS * 1000;
```

**Consumer evidence.** Production call sites of the two suspect exports: **none.**

- `getTashkentToday` — re-exported at `apps/backend/src/modules/telegram-intake/timezone-util.ts:9` and `apps/web/src/lib/formatters.ts:170`; its only other references are `packages/api-contracts/tests/timezone.test.ts:6,56`.
- `TASHKENT_OFFSET_MS` — referenced only at `packages/api-contracts/tests/timezone.test.ts:4,12`.

The one export with real reach is `getTashkentCalendarDay`, used by `timezone-util.ts:9` and consumed across `topic-query-engine.ts`, `topic-evidence-management-service.ts`, `telegram-intake-service.ts`, and `apps/backend/src/adapters/telegram/mtproto-normalizer.ts:11`.

**Deletion test.** **SURVIVES.** Delete `getTashkentToday` and complexity vanishes rather than moving: its body adds nothing over `getTashkentCalendarDay`, so callers would simply call the latter. Two re-export chains exist purely to relay symbols no production code invokes. This is the shallowest module in the layer.

**Fix direction.** Remove `getTashkentToday` and `TASHKENT_OFFSET_MS` from the public surface, or — if retained as intended API for future consumers — collapse the double re-export chain (`contracts → timezone-util.ts → callers`, and `contracts → formatters.ts`) so there is one path to the module. A `timezone` module whose real interface is one function is honest; a three-export surface with two dead ends is not.

**Acceptance criteria.** (1) Every export of the timezone module has at least one production consumer, or is removed. (2) No pass-through wrapper is exported as public API. (3) There is exactly one import path from consumers to these helpers.

---

### L1-P01-04 — Keyset cursor payload types are placed inconsistently across the seam

| Field | Value |
|---|---|
| Category | `hidden-dependency`, `duplication` |
| Severity | medium |
| Strength | `worth-exploring` |
| Confidence | high |
| Verification | `observed` |
| Location | `packages/api-contracts/src/{audit.ts:112,ai-operations.ts:170}` vs `apps/backend/src/modules/topics/{topic-query-engine.ts:79,topic-evidence-service.ts:46}` |

**Description.** Four features paginate with keyset cursors. Two declare their cursor payload in the contract package; two declare it inside the backend module. The same architectural decision has been made two different ways with no recorded reason.

**Verbatim evidence.**

```
// packages/api-contracts/src/audit.ts:112
export interface AuditKeysetCursorPayload extends KeysetCursorPayload {
```

```
// packages/api-contracts/src/ai-operations.ts:170
export interface AiOperationKeysetCursorPayload extends KeysetCursorPayload {
```

```
// apps/backend/src/modules/topics/topic-query-engine.ts:79
export interface TopicKeysetCursorPayload extends KeysetCursorPayload {
```

```
// apps/backend/src/modules/topics/topic-evidence-service.ts:46
export interface EvidenceKeysetCursorPayload extends KeysetCursorPayload {
```

Note also that `packages/api-contracts/src/topics.ts` — the natural home for a topic cursor — contains **no** cursor payload, while `signals.ts` uses `createKeysetPageSchema` (`signals.ts:58`) without a cursor payload of its own.

**Why it matters.** A cursor is an opaque wire artefact: the client receives it and sends it back. Where the payload's shape lives determines whether the client can reason about it at all. Audit and AI-operations cursors are visible to the browser; topic and evidence cursors are backend-private. The inconsistency means two pagination surfaces behave differently for no stated reason — and a future consumer of the topics API has no contract-level type to hold.

**Deletion test.** Not applicable to a type placement; retained as a `worth-exploring` finding rather than a `strong` one, because a plausible (if unrecorded) rationale exists: backend-private cursors keep DB-shaped fields out of the browser-safe package.

**Fix direction.** Decide the rule once — either all cursor payloads are contract-visible, or all are backend-private — and record the decision. If backend-private is correct, `AuditKeysetCursorPayload` and `AiOperationKeysetCursorPayload` should move out of the contract package.

**Acceptance criteria.** (1) All keyset cursor payloads follow one documented placement rule. (2) The rule is recorded where a future contributor will find it. (3) No cursor type is reachable from the browser unless intentional.

---

### L1-P01-05 — `IsoDateStringSchema` is regex-only and is re-validated by a different mechanism in the backend

| Field | Value |
|---|---|
| Category | `hidden-dependency`, `duplication` |
| Severity | medium |
| Strength | `worth-exploring` |
| Confidence | high |
| Verification | `observed` |
| Location | `packages/api-contracts/src/common.ts:7`; `apps/backend/src/modules/telegram-intake/timezone-util.ts:15-19` |

**Description.** The canonical calendar-day schema validates shape only, and the backend re-parses the same string with its own regex — throwing a plain `Error` rather than a domain error.

**Verbatim evidence.**

```
// packages/api-contracts/src/common.ts:7
export const IsoDateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
```

```
// apps/backend/src/modules/telegram-intake/timezone-util.ts:16-19
const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(calendarDay.trim());
if (!match || !match[1] || !match[2] || !match[3]) {
  throw new Error(`Invalid calendar day format: expected YYYY-MM-DD, received "${calendarDay}"`);
}
```

Contrast the module's own domain-error convention, which *does* carry transport metadata:

```
// apps/backend/src/modules/telegram-intake/timezone-util.ts:33-40
export class InvalidDateRangeError extends Error {
  readonly statusCode = 400;
  readonly code = 'INVALID_DATE_RANGE';
```

**Why it matters.** Two concerns. First, the schema accepts impossible dates — `2026-99-99` and `0000-00-00` both match `/^\d{4}-\d{2}-\d{2}$/` — so a malformed date passes contract validation and is only caught deeper in the backend, or not at all. Second, the regex is duplicated: the contract's pattern and the backend's parse encode the same grammar in two places, and they already differ in behaviour (`getTashkentDayBounds` trims its input; the schema does not). Third, the thrown plain `Error` will not carry `statusCode`/`code`, so it cannot be mapped by the route error handlers that key on those fields.

**Deletion test.** Removing the backend's hand-rolled parse and calling the schema instead would concentrate the date grammar at one seam — the duplication dissolves rather than moves.

**Fix direction.** Tighten `IsoDateStringSchema` to reject impossible calendar dates and export a parsing helper from the contract so the backend does not re-implement the grammar. Replace the raw `Error` with a domain error carrying `statusCode` and `code`, matching `InvalidDateRangeError`.

**Acceptance criteria.** (1) The contract rejects impossible dates, not just malformed shapes. (2) The date grammar is encoded once. (3) Every date-validation failure raises a domain error with `statusCode` and `code`.

---

### L1-P01-06 — `pagination.ts` declares ambient environment globals and has an environment-dependent throw path

| Field | Value |
|---|---|
| Category | `hidden-dependency` |
| Severity | medium |
| Strength | `worth-exploring` |
| Confidence | high |
| Verification | `observed` |
| Location | `packages/api-contracts/src/pagination.ts:48-58,74` |

**Description.** The browser-safe contract package hand-declares `Buffer`, `btoa`, and `atob` as ambient globals so it can encode cursors in either environment, and throws a raw `Error` when neither is present.

**Verbatim evidence.**

```
// packages/api-contracts/src/pagination.ts:48-58
declare const Buffer:
  | {
      from: (
        str: string,
        encoding?: string,
      ) => { toString: (encoding?: string) => string }
    }
  | undefined;

declare const btoa: ((data: string) => string) | undefined;
declare const atob: ((data: string) => string) | undefined;
```

```
// packages/api-contracts/src/pagination.ts:74
throw new Error('Base64 encoding environment unavailable');
```

**Why it matters.** The package's stated purpose (per `CONTEXT.md`) is to be *browser-safe*. This module reimplements Base64URL encoding twice — once over Node's `Buffer`, once over the web `btoa`/`atob` — behind a runtime environment probe, which means the same cursor can round-trip differently in the two paths, and the function has a documented failure mode that no caller handles. The hand-written ambient declarations also bypass the type system's knowledge of which environment is actually running.

**Deletion test.** Not applicable — the encoding must exist somewhere. Retained as `worth-exploring`: the friction is real but modest, and the browser-safe constraint genuinely justifies *some* accommodation.

**Fix direction.** Pick one Base64URL implementation and make the environment requirement explicit at the package boundary, or isolate encoding behind a single adapter the two runtimes inject. The `btoa(encodeURIComponent(json))` fallback path also differs from `Buffer.from(json, 'utf8').toString('base64url')` and deserves a round-trip test asserting byte-for-byte equality across both.

**Acceptance criteria.** (1) Cursor encoding produces identical output in Node and browser environments. (2) No ambient global is hand-declared in a contract module. (3) The unavailable-encoding failure mode is either eliminated or typed and handled.

## Residual uncertainty

- **Whether `TopicKeysetCursorPayload`'s backend placement is deliberate** — I could not find a recorded reason (L1-P01-04). Settling this needs the ADR/spec trail or the author, not more reading. Status: `unverified-risk` on the finding's severity, not its existence.
- **`getTashkentToday`'s intent** — the two re-export chains suggest it was meant as public API for web consumers, but no consumer adopted it (L1-P01-03). Whether it is aspirational or vestigial cannot be determined statically.
- **Runtime divergence between the two Base64 paths** (L1-P01-06) — provable only by executing both; not attempted under this phase's execution allowlist. Labelled `inferred`, not `observed`.
- **Coverage note.** `index.ts` was read in full (17 lines, pure barrel) and produced no finding. Barrel re-export of 17 modules with `export *` means namespace collisions between contract modules would surface only at build time; the backend typecheck is currently clean, so no collision is active. Not filed as a finding — a clean typecheck is the evidence that it is not currently a problem.

## Cross-references for later phases

- **P2** inherits `IsoDateStringSchema` and `DistrictIdSchema` consumers: `topics.ts:2,35,88,89,96,103,256,371,388`, `signals.ts:4,18,39`, `audit.ts:3,39,84,90`, `ai-operations.ts:7,90,92,109,111,150`.
- **P3** must settle the `ActorContext` collision, since `topic-query-engine.ts` declares the divergent variant (L1-P01-01) and consumes keyset cursors (L1-P01-04).
- **L6** owns the ADR-0006 assessment of `districtId` nullability deferred from L1-P01-01.

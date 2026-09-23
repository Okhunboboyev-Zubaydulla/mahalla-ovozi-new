# Phase 3 — Topics read path

| Field | Value |
|---|---|
| Phase | L3-P03 |
| Layer | L3 topics |
| Owner | subagent |
| Status | complete |
| ADR lens | 0003 |
| Scope | `apps/backend/src/modules/topics/topic-query-engine.ts`, `apps/backend/src/modules/topics/topic-query-helpers.ts`, `apps/backend/src/modules/topics/hokim-topics-routes.ts`, `apps/backend/src/modules/topics/district-topics-routes.ts` |
| Question | Is the query engine interface as wide as its implementation? |
| Findings | 0 blocker · 1 high · 8 medium · 1 low |

## Phase question and method

**Question.** Is the query engine's interface as wide as its implementation?

**Method.** Every file in scope was read in full; every suspected shallow module was put through the deletion test (delete it — does complexity vanish, or reappear across N callers?), and every surviving candidate carries a verbatim quote, a deletion-test verdict, a fix direction and acceptance criteria. Consumers were established by grepping the whole workspace (production and test separately) for each exported name, not by trusting the pre-existing claim in `docs/architecture-review/INDEX.md:88`. One read-only typecheck was run: `pnpm --filter @mahalla-ovozi/backend exec tsc --noEmit` → exit code 0, no diagnostics, so nothing below is a type error.

**Headline answer.** No. The implementation is deep — 1244 lines behind a genuine high-performance keyset query — but the interface is **wider than any caller uses**: 26 export lines carry 28 exported names, and 18 of those names are imported by nobody in the workspace. The module's entire production consumer set is two files (`district-topics-routes.ts`, `hokim-topics-routes.ts`), which touch only 10 of the 28 names. The seam is additionally drawn in the wrong place three times: a re-export facade over two other modules, a duplicated error class, and a duplicated cursor validator.

## Findings

### L3-P03-01 — 18 of 28 exported names have no consumer: the interface is ~3x wider than its use

| Field | Value |
|---|---|
| Category | `shallow-module` |
| Severity | high |
| Strength | strong |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/topic-query-engine.ts:29`, `:31`, `:68`, `:79`, `:84`, `:113-115`, `:119`, `:137`, `:150`, `:157`, `:168`, `:181`, `:230`, `:664`, `:1044` |

**Description.** The reported "26 export lines" is exact (`grep -c '^export '` returns 26). Those 26 lines export **28 names**, because line 29 re-exports three symbols. Verified by workspace-wide grep:

| Exported name | Line | Production consumers outside the file |
|---|---|---|
| `resolveDateBoundary` (via re-export) | 29 | 0 |
| `escapeLikePattern` (via re-export) | 29 | 0 (1 test) |
| `InvalidDateRangeError` (via re-export) | 29 | 1 (`district-topics-routes.ts:17`) |
| `CANONICAL_LANES` | 31 | 0 (the web app declares its own copies in `apps/web/src/topics/LaneMultiSelect.tsx:9`, `useHokimTopicBoard.ts:21`, `useTopicStatistics.ts:11`, `useDashboardFilterParams.ts:5`) |
| `DistrictNotFoundError` | 41 | 1 |
| `DistrictRequiredError` | 50 | 1 |
| `InvalidCursorError` | 59 | 1 |
| `TopicNotFoundError` | 68 | **0** (both routes import the identically-named class from `topic-evidence-service.ts:75`) |
| `TopicKeysetCursorPayload` | 79 | 0 |
| `encodeTopicKeysetCursor` | 84 | 0 |
| `decodeTopicKeysetCursor` | 88 | 2 |
| `KeysetCursorPayloadAlias` | 113 | 0 |
| `encodeKeysetCursorAlias` | 114 | 0 |
| `decodeKeysetCursorAlias` | 115 | 0 |
| `RawTopicRow` | 119 | 0 |
| `TopicQueryFilters` | 137 | 0 |
| `TopicQueryResult` | 150 | 0 |
| `HokimTopicBoardFilterParams` | 157 | 0 |
| `HokimLaneQueryParams` | 168 | 0 |
| `ActorContext` | 181 | 0 (two other modules declare their own: `districts/district-onboarding-engine.ts:62`, `hokim-accounts/hokim-accounts-service.ts:61`) |
| `queryDistrictMahallas` | 193 | 2 |
| `queryTopics` | 230 | 0 |
| `queryDistrictTopicsPage` | 442 | 1 |
| `queryHokimBoard` | 498 | 1 |
| `queryHokimLaneBatch` | 621 | 1 |
| `checkProcessingDelay` | 664 | 0 |
| `queryHokimStatistics` | 741 | 1 |
| `resolvePriorPeriodComparison` | 1044 | 0 |

**Zero-consumer count: 18 of 28 exported names, spanning 16 of the 26 export lines.** The pre-existing claim of "nine with zero consumers" (`docs/architecture-review/INDEX.md:88`) is refuted — the real figure is double it. The unused names are not only types: they include the engine's core primitive `queryTopics`, the delay detector `checkProcessingDelay`, the prior-period comparison `resolvePriorPeriodComparison`, and a three-name backward-compatibility alias triple.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topic-query-engine.ts:26-29
export { resolveDateBoundary, escapeLikePattern, InvalidDateRangeError };

// apps/backend/src/modules/topics/topic-query-engine.ts:113-115
// Backward compatibility aliases
export type KeysetCursorPayloadAlias = TopicKeysetCursorPayload;
export const encodeKeysetCursorAlias = encodeTopicKeysetCursor;
export const decodeKeysetCursorAlias = decodeTopicKeysetCursor;
```

**Why it matters.** A 1244-line module with 28 exported names and 2 real consumer files has an interface that documents a shared seam which does not exist. Each zero-consumer export is a stability commitment nobody asked for: `queryTopics` cannot be called by a new consumer without that consumer first reconstructing a `datePredicate: SQL` fragment (see `TopicQueryFilters.districtId`/`datePredicate` at lines 137-148), which is exactly why the engine is untestable through its own seam — the module's own test file (`apps/backend/tests/hokim-topic-search.test.ts:13`) imports a single 3-line helper, `escapeLikePattern`, and nothing else. Line 29 is worse than redundant: it makes `topic-query-engine.ts` a facade over `telegram-intake/timezone-util.ts` and `topic-query-helpers.ts`, hiding where `InvalidDateRangeError` is actually declared and arbitrarily re-exporting three of that module's ~six exports.

**Deletion test.** Delete the `export` keyword (not the declaration) from the 16 lines with no consumer. **Zero call sites change; no complexity reappears at any caller.** DISSOLUTION — these names were never earning their place in a shared seam. For line 29 specifically: deleting it breaks exactly one import (`district-topics-routes.ts:17`), which must then point at `../telegram-intake/timezone-util.js` where the class is declared. Dissolution.

**Fix direction.** Narrow the interface to the 10 consumed names. Drop line 29 and have `district-topics-routes.ts` import `InvalidDateRangeError` from its declaring module. Keep the internal types (`RawTopicRow`, `TopicQueryFilters`, `TopicQueryResult`, `HokimTopicBoardFilterParams`, `HokimLaneQueryParams`) un-exported unless a second consumer appears.

**Acceptance criteria.** (1) `topic-query-engine.ts` has at most 10 export lines, every one of them consumed outside the file or by a test that names the behaviour rather than a helper. (2) No export line is a re-export of a symbol declared in another module. (3) `pnpm --filter @mahalla-ovozi/backend exec tsc --noEmit` exits 0.

### L3-P03-02 — The backward-compatibility alias triple is dead code with a misleading name

| Field | Value |
|---|---|
| Category | `duplication` |
| Severity | medium |
| Strength | strong |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/topic-query-engine.ts:113-115` |

**Description.** The comment calls these "Backward compatibility aliases". A workspace-wide grep for all three names returns only three hits: their own declarations, plus a passing mention in the generated report `docs/architecture-review/architecture-review-20260922-2122.html:110`. There is no earlier name to be compatible with and no consumer to be compatible for. The aliases are not neutral, either: `KeysetCursorPayloadAlias` aliases a payload whose `id` is specifically a **Topic** id (line 81), while its name reads like the shared generic cursor payload declared in `packages/api-contracts/src/pagination.ts:42`. A future author importing `encodeKeysetCursorAlias` expecting the generic encoder gets topic-specific semantics with no type error, because `TopicKeysetCursorPayload extends KeysetCursorPayload`.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topic-query-engine.ts:77-115
// --- Keyset Cursor Encoding & Decoding ---

export interface TopicKeysetCursorPayload extends KeysetCursorPayload {
  t: string; // ISO datetime string of latestMeaningfulActivityTimestamp
  id: string; // topic id
}
...
// Backward compatibility aliases
export type KeysetCursorPayloadAlias = TopicKeysetCursorPayload;
export const encodeKeysetCursorAlias = encodeTopicKeysetCursor;
export const decodeKeysetCursorAlias = decodeTopicKeysetCursor;
```

**Why it matters.** It is three of the 18 zero-consumer names in L3-P03-01, and it is the one subset that actively misleads rather than merely sitting idle: the name suggests the generic pagination encoder while the value is a Topic-specific one. Dead code that is harmless wastes reading time; dead code with a plausible-looking wrong name invites the bug it is named after.

**Deletion test.** Delete all three lines. **Zero call sites change, no import breaks, nothing reappears.** DISSOLUTION — there is no back-compat surface to preserve.

**Fix direction.** Delete lines 113-115. If a genuine alias is ever needed for a released client contract, name it after the contract version (`TopicCursorV1Payload`) and record the reason.

**Acceptance criteria.** (1) The three alias names do not exist in the workspace. (2) Any remaining cursor payload type in `topic-query-engine.ts` is named `TopicKeysetCursorPayload`. (3) `tsc --noEmit` exits 0.

### L3-P03-03 — `TopicNotFoundError` is declared twice with two different error codes

| Field | Value |
|---|---|
| Category | `duplication` |
| Severity | medium |
| Strength | strong |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/topic-query-engine.ts:68-75`, `apps/backend/src/modules/topics/topic-evidence-service.ts:75-83`, `apps/backend/src/modules/topics/district-topics-routes.ts:22-26`, `apps/backend/src/modules/topics/hokim-topics-routes.ts:24-28` |

**Description.** Two same-named classes with the same `statusCode` (404) but **different `code` values**. Both route files import the `topic-evidence-service.ts` copy; the engine's copy is imported by nobody. The engine's class is therefore unreachable from any caller, yet it is exported and carries a `code` the client contract does not expect from that path.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topic-query-engine.ts:68-75
export class TopicNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = 'TOPIC_NOT_FOUND';
  constructor(message = 'Мавзу топилмади.') {
    super(message);
    this.name = 'TopicNotFoundError';
  }
}

// apps/backend/src/modules/topics/topic-evidence-service.ts:75-83
export class TopicNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = 'NOT_FOUND';

  constructor(message = 'Мавзу топилмади ёки сақлаш муддати тугаган.') {
    super(message);
    this.name = 'TopicNotFoundError';
  }
}
```

**Why it matters.** Both routes route 404s through duck-typing on `statusCode` as well as `instanceof` (`district-topics-routes.ts:231-246`, `hokim-topics-routes.ts:216-228`), which is why the duplicate does not currently crash anything — an engine-thrown `TopicNotFoundError` would still reach the client as HTTP 404, but with code `TOPIC_NOT_FOUND` instead of `NOT_FOUND`. That is the real cost: the client-visible error code for "Topic not found" depends on which of two identically-named classes happened to be thrown, and a third module writing `catch (e) { if (e instanceof TopicNotFoundError) }` after importing the engine's copy would silently take a branch the routes do not. The two-class situation also forces any future engine-side not-found signal into either a backwards dependency (read path importing the evidence path) or an unplanned error code.

**Deletion test.** Delete the engine's class at lines 68-75. **No import breaks, no call site changes, no complexity reappears** — the engine never throws it (grep for `new TopicNotFoundError` yields only `topic-evidence-service.ts:276`). DISSOLUTION.

**Fix direction.** Keep one declaration. Either delete the engine's copy, or make `topic-evidence-service.ts` import the engine's — but given that the not-found concept belongs to the evidence/Topic read path, the engine's copy should go.

**Acceptance criteria.** (1) Exactly one `TopicNotFoundError` declaration exists in the workspace. (2) Both topics route files import it from the same module. (3) The error code returned for a missing Topic is identical on both surfaces.

### L3-P03-04 — The cursor is decoded twice in one condition, and the first decode cannot change the outcome

| Field | Value |
|---|---|
| Category | `low-locality` |
| Severity | medium |
| Strength | strong |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/hokim-topics-routes.ts:132`, `apps/backend/src/modules/topics/hokim-topics-routes.ts:336`, `packages/api-contracts/src/pagination.ts:81-105`, `apps/backend/src/modules/topics/topic-query-engine.ts:88-110` |

**Description.** The condition calls **both** validators on the same cursor and ORs their negations. The two are not independent validators: `decodeTopicKeysetCursor` (engine line 88) *begins* by calling `decodeKeysetCursor` (engine line 91) and returns `null` whenever that returns `null`. So `decodeKeysetCursor(c) === null` implies `decodeTopicKeysetCursor(c) === null`, and `!A || !B` collapses to `!B`. The first operand is dead logic, not a second opinion. Both operands are literally the same function (`pagination.ts:81`), invoked twice with the same argument and the same deterministic base64/JSON parse — so the redundancy costs a wasted decode per request while changing nothing.

The count per request is worse than two: the route validates, then `queryTopics` validates the *same* cursor a third time at engine line 293-297 and throws `InvalidCursorError`, which both handlers already map (`hokim-topics-routes.ts:149-156`, `:353-360`). So the route-level check duplicates a check that the seam performs itself, behind the seam, with a typed error that the route already handles.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/hokim-topics-routes.ts:130-139
        const { cursor } = req.query;

        if (cursor && (!decodeKeysetCursor(cursor) || !decodeTopicKeysetCursor(cursor))) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_CURSOR',
              message: 'Курсор нотўғри ёки муддати ўтган.',
            },
          });
        }

// apps/backend/src/modules/topics/topic-query-engine.ts:88-97
export function decodeTopicKeysetCursor(
  cursor: string | null | undefined,
): TopicKeysetCursorPayload | null {
  const parsed = decodeKeysetCursor<TopicKeysetCursorPayload>(cursor);
  if (
    parsed &&
    typeof parsed.t === 'string' &&
...
    typeof parsed.id === 'string' &&
    parsed.id.length > 0 &&
    parsed.id.length <= 100
  ) {

// apps/backend/src/modules/topics/topic-query-engine.ts:292-297
  let cursorPredicate = sql``;
  if (cursor) {
    const decoded = decodeTopicKeysetCursor(cursor);
    if (!decoded) {
      throw new InvalidCursorError('Курсор нотўғри ёки муддати ўтган.');
    }
```

**Why it matters.** This is the clearest low-locality symptom in the module: the invariant "a Topic cursor is valid iff `decodeTopicKeysetCursor` accepts it" lives in three places (two route lines plus the engine), and the route copies are written as if the contracts-package decoder were an independent, complementary check. A maintainer tightening cursor validation must now edit four sites and reason about an OR that cannot ever be satisfied by the weaker branch. If the engine's TTL rules ever change (see L3-P03-10), the route's weaker first call will keep silently agreeing with itself and the divergence will be invisible.

**Deletion test.** Delete `!decodeKeysetCursor(cursor) ||` and its import from `hokim-topics-routes.ts` (both occurrences). **No complexity reappears**: the surviving check is strictly stronger, and the engine independently re-validates and throws `InvalidCursorError`, which both handlers already catch and map to 400 `INVALID_CURSOR`. DISSOLUTION — the duplicated branch is not load-bearing.

**Fix direction.** Validate the cursor in exactly one layer. Preferred: let the seam own it (the engine already throws `InvalidCursorError`), and delete both route-level cursor blocks. If the route must fail fast before any DB work, keep a single call to `decodeTopicKeysetCursor` and drop the `decodeKeysetCursor` operand and import.

**Acceptance criteria.** (1) `decodeKeysetCursor` is not imported by `hokim-topics-routes.ts`. (2) A malformed cursor still produces HTTP 400 with code `INVALID_CURSOR` on both lane endpoints. (3) No cursor string is decoded more than once per request path.

### L3-P03-05 — An empty `?cursor=` (or `"cursor": ""`) is silently treated as no pagination

| Field | Value |
|---|---|
| Category | `error-handling` |
| Severity | medium |
| Strength | strong |
| Confidence | high |
| Verification | observed |
| Location | `packages/api-contracts/src/topics.ts:161-164`, `apps/backend/src/modules/topics/hokim-topics-routes.ts:130-139`, `apps/backend/src/modules/topics/hokim-topics-routes.ts:334-343`, `apps/backend/src/modules/topics/district-topics-routes.ts:76-84`, `apps/backend/src/modules/topics/district-topics-routes.ts:117-125` |

**Description.** `cursorPaginationFields` declares `cursor: z.string().optional()` — **no `.min(1)`** — so `GET /api/v1/districts/x/topics?cursor=` and `POST .../search {"cursor":""}` both pass schema validation with `cursor === ''`. Every consumer then uses a truthiness guard, so the empty string takes the "no cursor" branch and the request silently returns **page 1**. The four affected call paths are the lane GET/POST in `hokim-topics-routes.ts` (guard `if (cursor && ...)` at 132 and 336), the district GET/POST (`if (cursor && !decodeTopicKeysetCursor(cursor))` at 77 and 118), and, as a consequence, `queryTopics`' own `if (cursor)` at `topic-query-engine.ts:293`. Note this is **not** an "invalid cursor" case that the route rejects — it is accepted and ignored.

The inconsistency is provable inside the same package: the shared pagination contract does clamp it.

**Verbatim evidence.**
```
// packages/api-contracts/src/topics.ts:161-164
const cursorPaginationFields = {
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

// packages/api-contracts/src/pagination.ts:13-17
export const CursorPaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().min(1).optional(),
  direction: z.enum(['forward', 'backward']).default('forward'),
});
```

**Why it matters.** Any client that builds a cursor query parameter by string concatenation from an unset state (a very ordinary front-end bug) gets a **duplicated first page** with `hasNextPage: true` and no error — a pagination loop that silently never advances and is invisible in logs, because nothing was rejected. The same class of bug is already closed in the sibling contract, so the divergence is an oversight rather than a decision. The route-level truthiness guards are what turn a validation gap into silent behaviour: had the routes decoded unconditionally, the empty string would have been caught by `decodeKeysetCursor` (`pagination.ts:84` returns `null` for falsy input) and surfaced as a 400.

**Deletion test.** Not a module-deletion candidate — this is a contract gap. Deleting the truthiness guards (i.e. calling `decodeTopicKeysetCursor(cursor)` unconditionally) makes the empty cursor reach the validator and become a 400; that is the fix, not a dissolution. Recorded as a surviving candidate because it has all four evidence elements.

**Fix direction.** Add `.min(1)` to `cursor` in `cursorPaginationFields` (`packages/api-contracts/src/topics.ts:162`) and in `TopicEvidenceQuerySchema` (`packages/api-contracts/src/topics.ts:297`), matching `CursorPaginationQuerySchema`. Alternatively compose the shared schema instead of re-declaring the two fields. Keep the route guards as defence in depth, but do not rely on them to reject.

**Acceptance criteria.** (1) `HokimLaneQuerySchema.parse({ cursor: '' })` throws. (2) `GET /api/v1/hokim/topics/lane?lane=WATER&cursor=` returns 400 `VALIDATION_ERROR`, not page 1. (3) No other query schema in `packages/api-contracts/src/topics.ts` accepts an empty-string cursor.

### L3-P03-06 — The route layer already knows the answer to "is this District valid", and asks anyway

| Field | Value |
|---|---|
| Category | `duplication` |
| Severity | medium |
| Strength | strong |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/district-topics-routes.ts:176-183`, `apps/backend/src/modules/topics/topic-query-engine.ts:455-461` |

**Description.** The district evidence handler performs its own District existence check and then calls `getTopicEvidence` on the *next line* — but `getTopicEvidence` receives `{ id: 'product_owner', districtId, role: 'PRODUCT_OWNER' }` as its actor and the district is validated again inside `topic-evidence-service.ts` (the service is documented as throwing `TopicNotFoundError` when the Topic is inaccessible). Meanwhile the *other* three district endpoints get the same guarantee from the engine, which re-checks `districts` for every district page request.

The check is not wrong, it is **displaced**: `DistrictNotFoundError` is declared in the engine (line 41) specifically because the engine owns the "District exists" invariant, and `queryDistrictTopicsPage` already throws it (engine line 460). The route duplicates the query instead of trusting the seam it just invoked, and does so with an inline `db.query.districts.findFirst` that reaches into the database adapter from the transport layer.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/district-topics-routes.ts:176-190
        try {
          const district = await db.query.districts.findFirst({
            where: eq(districts.id, districtId),
          });

          if (!district) {
            throw new DistrictNotFoundError('Туман топилмади.');
          }

          const evidenceResponse = await getTopicEvidence(
            db,
            { id: 'product_owner', districtId, role: 'PRODUCT_OWNER' },
            topicId,
            req.query,
          );

// apps/backend/src/modules/topics/topic-query-engine.ts:455-461
  const district = await db.query.districts.findFirst({
    where: eq(districts.id, districtId),
  });

  if (!district) {
    throw new DistrictNotFoundError('Туман топилмади.');
  }
```

**Why it matters.** The route file imports `eq` and the `districts` table (`district-topics-routes.ts:3`, `:10`) purely to re-answer a question the engine already answers, which is the concrete mechanism by which a transport adapter stops being thin. It also means the "District exists" invariant has two owners with two different ordering guarantees: the route checks before building the actor, the engine checks before running the query, and nothing states which one a new endpoint must copy.

**Deletion test.** Delete the route-level check. **No complexity reappears at this call site** — the engine still performs it for the three endpoints that need it, and a missing District still yields HTTP 404 `DISTRICT_NOT_FOUND` through `handleDistrictTopicsError` (line 201) because the engine throws the same class. Whether the *evidence* endpoint keeps its 404 depends on `getTopicEvidence`'s own checks (`topic-evidence-service.ts:276` throws `TopicNotFoundError` → mapped to 404 `NOT_FOUND`), so the observable status is preserved. PARTIAL DISSOLUTION: the duplicated `findFirst` goes away; the invariant stays owned by one module.

**Fix direction.** Decide the owner. Either move the District-existence check into `getTopicEvidence` (so all four district endpoints inherit it from the seam) and delete the route copy along with the `eq`/`districts` imports, or make the route's check the single one and have `queryDistrictTopicsPage` trust its caller. Do not keep both.

**Acceptance criteria.** (1) `district-topics-routes.ts` contains no direct `db.query.districts` call. (2) A request for a non-existent District still returns 404 on all four district endpoints. (3) The "District exists" check exists in exactly one module.

### L3-P03-07 — `handleDistrictTopicsError` is a transport-level error mapper doing contract work

| Field | Value |
|---|---|
| Category | `leaky-seam` |
| Severity | medium |
| Strength | strong |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/district-topics-routes.ts:200-249` |

**Description.** The mapper is thorough and, unusually, **re-throws** anything it does not recognise (line 248), which is the right instinct — but it also carries a duck-typed catch-all that reaches into the error's shape (`'statusCode' in err`, `'code' in err`) and re-derives an HTTP body from it. That catch-all is the only reason the duplicated `TopicNotFoundError` (L3-P03-03) does not currently surface as a 500 on the district evidence endpoint: the engine's copy carries `code = 'TOPIC_NOT_FOUND'` while the mapper's `instanceof` branch expects the evidence service's `NOT_FOUND` copy. The mapper therefore encodes a knowledge of error-class identity that its own `import` list contradicts.

The two surfaces also disagree on the HTTP status of a malformed evidence cursor, which is the observable cost of having two mappers: `district-topics-routes.ts:167-174` answers 400 with code `INVALID_CURSOR`, while the equivalent Hokim handler answers 400 with code `VALIDATION_ERROR` (`hokim-topics-routes.ts:197-204`).

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/district-topics-routes.ts:231-249
  if (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof (err as { statusCode: number }).statusCode === 'number'
  ) {
    const statusCode = (err as { statusCode: number }).statusCode;
    const code =
      'code' in err && typeof (err as { code: string }).code === 'string'
        ? (err as { code: string }).code
        : 'ERROR';
    const message = err instanceof Error ? err.message : 'Хатолик юз берди.';
    return reply.status(statusCode).send({
      error: { code, message },
    });
  }

  throw err;

// apps/backend/src/modules/topics/hokim-topics-routes.ts:196-204
        const { cursor } = req.query;
        if (cursor && !decodeEvidenceKeysetCursor(cursor)) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Курсор нотўғри ёки муддати ўтган.',
            },
          });
        }
```

**Why it matters.** The seam between "domain throws" and "HTTP renders" is where a query engine's error vocabulary becomes a client contract. Right now that translation exists twice, in two shapes (a centralised mapper with re-throw in one file, inline 400 sends with per-endpoint codes in the other), and the two disagree on codes for equivalent failures. The duck-typed branch additionally makes the mapper tolerant of error classes it cannot name — which is exactly the condition under which a genuinely unexpected 500 gets laundered into a 4xx.

**Deletion test.** Delete the duck-typed branch (lines 231-246). **Complexity reappears**: an engine-thrown error whose class the mapper does not `instanceof` would escape as a 500. So this branch is earning its keep as a *safety net* — a SURVIVOR, but one whose necessity is manufactured by L3-P03-03's duplicate class. Fixing that duplicate is what makes this branch deletable.

**Fix direction.** Collapse the two surfaces' error translation into one shared mapper behind the topic seam (both route files import the same helper), give each domain error exactly one declaration, and keep the re-throw. Reduce the duck-typed branch to a single deliberate fallback that logs.

**Acceptance criteria.** (1) A malformed evidence cursor returns the same HTTP status and error code on both the Hokim and District surfaces. (2) Each domain error class is declared once and matched by `instanceof` only. (3) The mapper still re-throws unrecognised errors instead of returning 500 as a 4xx.

### L3-P03-08 — `queryHokimBoard` both reads and writes the dashboard-visit baseline inside a read path

| Field | Value |
|---|---|
| Category | `hidden-dependency` |
| Severity | medium |
| Strength | strong |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/topic-query-engine.ts:531-556`, `apps/backend/src/modules/topics/hokim-topics-routes.ts:93-98`, `apps/backend/src/modules/topics/hokim-topics-routes.ts:297-302` |

**Description.** A function named `queryHokimBoard` — called from a `GET` handler — inserts a row into `user_dashboard_visits` as a side effect, and its returned `isNew`/`isUpdated` flags depend on a *previous* visit that the same call then overwrites. So the first GET of a session returns a payload computed from the pre-existing baseline, and any subsequent identical GET returns a payload whose baseline is now the previous call. The interface signature (`db, actorContext, paramsOrCalendarDay?, baselineTimestampOverride?`) says nothing about this: a caller cannot tell that the read is self-consuming, and `evaluationId: crypto.randomUUID()` (line 607) makes each response look like a fresh independent evaluation.

Both board endpoints inherit this — the GET at `hokim-topics-routes.ts:93` and the POST search at `:297` — and the POST search path is one where a client is far less likely to expect a visit record to be written, since the caller supplies its own search body.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topic-query-engine.ts:531-555
  const currentVisitDate = new Date();
  let visitBaselineTimestamp: string | null = null;

  const baseline = filterParams.baselineTimestamp || baselineTimestampOverride;

  if (baseline) {
    visitBaselineTimestamp = baseline;
  } else {
    const prevVisit = await db.query.userDashboardVisits.findFirst({
      where: and(
        eq(userDashboardVisits.userId, actorContext.id),
        eq(userDashboardVisits.districtId, actorContext.districtId),
      ),
      orderBy: [desc(userDashboardVisits.visitedAt)],
    });

    visitBaselineTimestamp = prevVisit ? prevVisit.visitedAt.toISOString() : null;

    await db.insert(userDashboardVisits).values({
      id: `vis_${crypto.randomUUID()}`,
      userId: actorContext.id,
      districtId: actorContext.districtId,
      visitedAt: currentVisitDate,
      createdAt: currentVisitDate,
    });
  }
```

**Why it matters.** This is a hidden dependency the interface does not advertise: the module's contract is "return the board", but its behaviour is "return the board **and advance the novelty baseline**". A retry, a prefetch, a React StrictMode double-invoke or a client-side double-submit silently consumes the "new/updated" markers for the next request, and the loss is invisible because the second response is still a valid, well-formed board. It also makes the read path non-idempotent, which is why nothing about this module can be exercised through its seam without writing visit rows (see L3-P03-09).

**Deletion test.** Delete the `db.insert` — complexity **reappears at the callers**: each route would have to decide when a visit is recorded, and the two board endpoints would have to agree. So the write is earning its keep and must not simply be deleted; it must be **named**. SURVIVOR (relocate, do not remove).

**Fix direction.** Either split the read from the baseline advance (a `GET` that computes novelty from the stored baseline, plus an explicit `POST /visit` that advances it), or keep the coupling but make it explicit in the interface: rename to `openHokimBoard`, document the write, and give the route an idempotency guard. Whichever is chosen, the write must not be triggered by a search POST.

**Acceptance criteria.** (1) Repeating an identical board request does not consume the novelty baseline twice, or the behaviour is documented and covered by a test. (2) The POST search endpoint does not record a dashboard visit. (3) The function's name or signature states that it mutates visit state.

### L3-P03-09 — The engine's seam is untestable: no caller can supply the `datePredicate` the interface demands

| Field | Value |
|---|---|
| Category | `untestable-interface` |
| Severity | medium |
| Strength | strong |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/topic-query-engine.ts:137-148`, `apps/backend/src/modules/topics/topic-query-engine.ts:230-242`, `apps/backend/tests/hokim-topic-search.test.ts:13` |

**Description.** `queryTopics` is the one function that contains the entire query implementation (the keyset predicate, the lane JSONB predicate, the match-badge CASE, the count query, the cursor encoding), and it is the only exported function with **zero consumers in production or tests**. The reason is visible in its parameter type: `TopicQueryFilters` requires a `datePredicate: SQL` — a raw Drizzle fragment — plus a `districtId`, and it is not exported for reuse, so a would-be caller must import an internal type to call a public function. Every actual caller is a sibling in the same file.

Empirically, the module's own test file imports exactly one thing from the engine — a three-line helper — and tests nothing else about the read path.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topic-query-engine.ts:137-148
export interface TopicQueryFilters {
  districtId: string;
  datePredicate: SQL;
  mahallaName?: string;
  lanes?: readonly QualifyingLane[];
  search?: string;
  cursor?: string;
  limit: number;
  baselineTimestamp?: string | null;
  targetLane?: QualifyingLane;
  includeCount?: boolean;
}

// apps/backend/tests/hokim-topic-search.test.ts:13
import { escapeLikePattern } from '../src/modules/topics/topic-query-engine.js';
```

**Why it matters.** The core of the read path cannot be exercised without reconstructing a date predicate by hand, which is why the module ships with its SQL predicate logic untested while its 3-line string escaper has four assertions. The interface is not merely wide (L3-P03-01); it is wide in the one dimension that makes testing hard — it exposes an internal representation (`SQL` fragment) rather than an intention (`dateScope`/`calendarDay`), even though the sibling entry points (`queryDistrictTopicsPage`, `queryHokimLaneBatch`) already accept the intention-shaped parameters and resolve them internally.

**Deletion test.** Delete `queryTopics`' export. **Complexity does not reappear anywhere** — all three internal callers live in the same file. DISSOLUTION as a *public* export; the function itself must stay internal, and the seam should instead be drawn at the intention-level entry points.

**Fix direction.** Make the public seam intention-shaped: let the exported entry points accept `{ dateScope, dateFrom, dateTo, calendarDay }` (which they already do) and keep `queryTopics` private. If a second consumer genuinely needs the raw query, expose a resolver (`resolveTopicDatePredicate`) rather than the `SQL` parameter, so tests can drive the engine through a real date scope.

**Acceptance criteria.** (1) `queryTopics` and `TopicQueryFilters` are not exported. (2) At least one test drives a topic page through an exported entry point using a `dateScope`/`calendarDay` argument, not a hand-built `SQL` fragment. (3) `tsc --noEmit` exits 0.

### L3-P03-10 — The engine inherits its calendar day from a caller-supplied predicate but reports `calendarDay` from a second, independent clock read

| Field | Value |
|---|---|
| Category | `adr-conflict` |
| Severity | low |
| Strength | worth-exploring |
| Confidence | medium |
| Verification | inferred |
| Location | `apps/backend/src/modules/topics/topic-query-engine.ts:230-242`, `apps/backend/src/modules/topics/topic-query-engine.ts:481-489`, `apps/backend/src/modules/topics/topic-query-engine.ts:524-529`, `apps/backend/src/modules/topics/topic-query-engine.ts:603-613`, `apps/backend/src/modules/telegram-intake/timezone-util.ts:54-57`, `apps/backend/src/modules/telegram-intake/timezone-util.ts:102-105` |

**Description.** ADR-0003 is honoured correctly in the query itself: every non-custom path in `resolveDateBoundary` produces a `t.calendar_day` equality, so a Topic can never be returned for a neighbouring day and no Topic can roll over. The residual concern is narrower — the day the *response claims* to describe is computed separately from the day the *query* filtered on.

`resolveDateBoundary` reads `Date.now()` once (line 54) to derive `today`, and `queryTopics` then requires the resulting `datePredicate: SQL` as an opaque parameter (`TopicQueryFilters.datePredicate`, line 139). The exported entry points call `resolveDateBoundary` and receive `resolvedCalendarDay` alongside it — `queryDistrictTopicsPage` discards it (line 463) and re-stamps `serverEvaluatedAt: new Date().toISOString()` at line 488 from a **second** clock read; `queryHokimBoard` does use it (line 524) but separately stamps `serverEvaluatedAt: currentVisitDate.toISOString()` from a third read taken at line 531. Between the boundary read and the stamp read the process can cross Tashkent midnight, so a response can pair `calendarDay: <yesterday>` with a `serverEvaluatedAt` after midnight — and in `queryHokimStatistics` the same `resolveDateBoundary` read (line 758) is followed by `resolvePriorPeriodComparison` calling `getTashkentCalendarDay` again (lines 1071-1072), so the "today" used for the prior-period case selection can differ from the "today" used for the filter.

The engine also has no guard preventing a caller from passing a cross-day range: a `custom` scope legitimately produces `t.calendar_day >= X AND t.calendar_day <= Y`, which is an ADR-0003-permitted multi-day *filter* over distinct same-day Topics, but nothing in the interface states that constraint, so a future caller could construct a `datePredicate` that violates the boundary without the engine objecting.

**Verbatim evidence.**
```
// apps/backend/src/modules/telegram-intake/timezone-util.ts:54-57
  const nowSeconds = Math.floor(Date.now() / 1000);
  const today = getTashkentCalendarDay(nowSeconds);
  const yesterday = getTashkentCalendarDay(nowSeconds - 86400);
  const retentionLowerBound = getTashkentCalendarDay(nowSeconds - 90 * 86400);

// apps/backend/src/modules/topics/topic-query-engine.ts:137-139
export interface TopicQueryFilters {
  districtId: string;
  datePredicate: SQL;

// apps/backend/src/modules/topics/topic-query-engine.ts:481-489
  return {
    districtId: district.id,
    districtName: district.name,
    topics: queryResult.topics,
    totalCount: queryResult.totalCount ?? 0,
    nextCursor: queryResult.nextCursor,
    hasNextPage: queryResult.hasNextPage,
    serverEvaluatedAt: new Date().toISOString(),
  };
```

**Why it matters.** ADR-0003 consequence clause promises Hokims "immutable, static records of what was reported on that specific date". If the day label and the filter are derived from different clock reads, the immutability claim holds for the query but not for the label, and the mismatch is only reachable inside the midnight window — the hardest possible case to reproduce and the exact case the ADR exists to make predictable. This is a narrow, low-severity contract gap, not a demonstrated production bug: no observed code path lets a caller inject a bad predicate today.

**Deletion test.** Not a deletion candidate — the seam is doing real work and the ADR is honoured in the predicate. Recorded as a surviving candidate because it carries a verbatim quote, a fix direction and acceptance criteria.

**Fix direction.** Read the clock once per request and thread the resolved day through: have the entry points pass their single `resolvedCalendarDay` into both the query and the response stamp (`serverEvaluatedAt`), and have `resolvePriorPeriodComparison` take the already-resolved `today` as a parameter instead of re-deriving it. Document in `TopicQueryFilters` that `datePredicate` must bound `t.calendar_day` to whole Asia/Tashkent days.

**Acceptance criteria.** (1) Each request derives "today in Asia/Tashkent" exactly once. (2) The `calendarDay` and `serverEvaluatedAt` in one response cannot describe different calendar days. (3) `TopicQueryFilters.datePredicate` documents the same-day constraint, and no exported entry point can produce a cross-day predicate outside `custom` scope.

## Deferred to L6 (ADR-0006)

- `apps/backend/src/modules/topics/district-topics-routes.ts:187` builds a synthetic actor `{ id: 'product_owner', districtId, role: 'PRODUCT_OWNER' }` from a URL path parameter and passes it into `getTopicEvidence`; the District comes from the request, not from the authenticated actor, so District scoping on that endpoint rests on the `createRequireProductOwner` guard alone.

## Residual uncertainty

- **Whether the alias triple once had a consumer.** I could not find a released client or an older commit that imported `encodeKeysetCursorAlias` / `decodeKeysetCursorAlias` / `KeysetCursorPayloadAlias`; no CHANGELOG or ADR explains them. That they are unreferenced *today* is observed; whether deleting them breaks an out-of-repo consumer is `unverified-risk` and needs the release/contract trail or the author, not more reading.
- **Whether `resolvePriorPeriodComparison` and `checkProcessingDelay` are exercised through any non-import route.** Both are unreferenced by import anywhere in the workspace, but the backend also runs a worker entrypoint; I did not enumerate `apps/backend/src/entrypoints/` beyond `http.ts`, so a dynamic or worker-side call cannot be excluded by grep alone. Read as `inferred`, not `observed`.
- **Whether the ADR-0003 midnight-window label mismatch is reachable in production.** I did not execute code or freeze the clock, so the divergence is `inferred` from two independent `Date.now()` / `new Date()` reads; no test asserts the day label, and I was not permitted to run tests.
- **Whether the 90-day and future-dated cursor TTLs in `decodeTopicKeysetCursor` (engine lines 102-106) interact with the 90-day retention bound in `resolveDateBoundary`** in a way that can reject a cursor a client legitimately received. Both use the same 90x86400 second constant but are computed at different times and places; I did not model the boundary case.
- **Performance of the per-lane `Promise.all` in `queryHokimBoard`.** Five concurrent `queryTopics` calls each issue their own count query (`includeCount: true`, engine line 582) against the same `filtered_topics` shape. I did not measure the database cost and cannot say whether a single grouped query would be materially cheaper; recorded as unmeasured rather than as a finding.
- **`topic-query-helpers.ts` size discrepancy.** The task brief describes it as 2,031 bytes / 44 lines; the file on disk is 47 lines. Content matches the description (escaping helper plus shared search predicate); the byte/line figure in the brief is simply stale. `topic-query-helpers.ts` itself yielded no finding: it is a two-function module with exactly one consumer, and deleting either function would force the 20-line search predicate to be re-inlined at two sites inside `topic-query-engine.ts`, so both functions are earning their keep. Deletion test: SURVIVOR, no finding filed.

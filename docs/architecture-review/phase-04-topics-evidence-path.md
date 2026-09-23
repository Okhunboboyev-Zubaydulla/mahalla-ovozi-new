# Phase 4 — Topics evidence path

| Field | Value |
|---|---|
| Phase | L3-P04 |
| Layer | L3 topics |
| Owner | subagent |
| Status | **complete (6 of 10 recorded)** |
| ADR lens | 0002 |
| Scope | `apps/backend/src/modules/topics/topic-evidence-management-service.ts`, `apps/backend/src/modules/topics/topic-evidence-service.ts`, `apps/backend/src/modules/topics/admin-signals-routes.ts` |
| Question | Is there one owner of Accepted Evidence reading, or several? |
| Findings | 0 blocker · 1 high · 5 medium recorded — **of 10 claimed** |

> **Artifact integrity notice (added 2026-09-23).** This artifact as originally written went from `## Phase question and method` straight to `### L3-P04-05`; findings **-02, -03 and -04 have no record in it**. `L3-P04-01` was recovered in full from the working file `.p04-tmp.md` and is promoted below. `-02` and `-03` are scheduled for re-derivation in **P4R** (`phase-04r-evidence-read-repair.md`); `-04`'s substance survives in prose at the correction note below. See the *Artifact integrity* section of `INDEX.md` for the audit.

## Phase question and method

**Answer.** There are **three** places that read Accepted Evidence, and the module has **no single owner** of the reading. One of them (`topic-evidence-service.ts` → `getTopicEvidence`) owns the Topic-scoped, Hokim-facing read of Accepted Evidence and reads the `verbatim_text` column directly. A second (`topic-evidence-management-service.ts` → `listSignals`, `getSignalDetail`) owns the intake-centric Product Owner triage read, which reaches Accepted Evidence only as the right-hand side of a `LEFT JOIN` from `telegram_intake_records` and therefore needs a raw-payload fallback for rows that have no Accepted Evidence at all. A third (`topic-query-engine.ts`) touches the `accepted_evidence` table only to count rows and to classify search-match badges, never to render verbatim text. The split is **half principled**: topic-scoped reading versus intake-centric triage really are different concerns with different retention semantics and different keyset cursors, so the two query shapes do not collapse. The split is **half accidental**: the moment either side needs to turn a stored payload into display text, each one answers that question its own way — and the module contains **three** independent hand-written answers (findings L3-P04-02 and L3-P04-03). Nothing in the module owns "what is the verbatim display text of this evidence".

**Method.** Deep-module vocabulary is used throughout: *module*, *interface*, *depth*, *seam*, *locality*. The primary instrument is the **deletion test** — for each candidate module I asked whether deleting it makes complexity *vanish* (pass-through → shallow, candidate recorded and dropped) or makes it *reappear across N callers* (earning its keep → candidate dropped). Every deletion test outcome is recorded below, whether the candidate survived or not.

**Read in full.** The three in-scope files were read end to end (362, 1344 and 387 lines). Because both services are wide, call sites were traced out of scope: `topic-query-engine.ts` (the `TopicNotFoundError` collision and the topic-board SQL), `hokim-topics-routes.ts` and `district-topics-routes.ts` (both evidence routes and their error mappers), `apps/backend/src/modules/ai/jobs/semantic-relevance-job-handler.ts` (the second payload walker), the `accepted_evidence` and `topic_projections` schema files, `topic-projection-evaluator.ts` (the bureaucratic-filler guardrail), `topic-projection-job-handler.ts`, and `packages/api-contracts/src/topics.ts`. `docs/adr/0002-postgresql-pgboss-transactional-intake.md` was read and is the ADR lens; ADR-0001, ADR-0006 and ADR-0008 are deliberately out of bounds and are not filed against.

**Instrument check.** `pnpm --filter @mahalla-ovozi/backend exec tsc --noEmit` exits `0` against HEAD `bdf999a`. The baseline is clean, so **none** of the findings below is a compile error, a type error, or a lint suppression; every one of them is a semantic or structural observation that the type checker cannot see. No test suite was executed, per the phase constraints.

**Correction to the inherited brief.** The brief states that `topic-evidence-management-service.ts` has "only 4 exports". That is **not** the case. The true count is **11 exports**, and the discrepancy is mechanical: seven of them are declared with a stray leading two-space indent, so a `^export` grep misses them. Both the real count and the indentation artifact were reported in **L3-P04-04**, which has no record in this artifact (see the integrity notice above) — the finding ID and this sentence are all that survive of it.

### L3-P04-01 — Accepted Evidence reading has no single owner; two modules own overlapping halves

| Field | Value |
|---|---|
| Category | low-locality |
| Severity | **high** |
| Strength | strong |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/topic-evidence-service.ts:188`, `apps/backend/src/modules/topics/topic-evidence-management-service.ts:122`, `apps/backend/src/modules/topics/topic-evidence-management-service.ts:394` |

**Description.** Three places read the `accepted_evidence` table, and ownership of "read Accepted Evidence for display" is split across two modules that were never reconciled.

1. `getTopicEvidence` (`topic-evidence-service.ts:188`) owns the **Topic-scoped, Hokim-facing** read. It selects from `accepted_evidence ae LEFT JOIN district_telegram_groups dtg` (`:263-265`) and renders `ae.verbatim_text` straight into `TopicEvidenceItem.verbatimText` (`:331`). It never touches `telegram_intake_records` and never walks a raw payload, because every row it reads is by definition Accepted Evidence with a non-null `verbatim_text` column.
2. `listSignals` (`topic-evidence-management-service.ts:122`) and `getSignalDetail` (`:394`) own the **intake-centric Product Owner triage** read. They select from `telegram_intake_records` and reach Accepted Evidence only as the right-hand side of `LEFT JOIN accepted_evidence ON accepted_evidence.intake_record_id = telegram_intake_records.id` (`:154-157`, `:424-427`). Most triaged rows are *not* Accepted Evidence, so `accepted_evidence.verbatim_text` is frequently NULL here and the module needs a raw-payload fallback.
3. `topic-query-engine.ts` reads the table only to `COUNT(ae.id)` (`:320`) and to classify `searchMatchBadge` (`:270-287`); it never renders verbatim text. This is a legitimate third concern and is **not** filed as a finding.

The split between (1) and (2) is **principled** — different actor (Hokim vs Product Owner), different anchor table, different cursor encoding (`EvidenceKeysetCursorPayload` `t`/`msgId`/`id` at `topic-evidence-service.ts:46-50` versus the `timestamp`/`id` tuple at `topic-evidence-management-service.ts:362-365`), and different retention semantics. It is **accidental** at the one point they genuinely overlap: turning a stored payload into display text. Both sides must answer that question, and each answered it privately (L3-P04-02, L3-P04-03).

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topic-evidence-service.ts:263-267
        FROM accepted_evidence ae
        LEFT JOIN district_telegram_groups dtg 
          ON dtg.district_id = ae.district_id AND dtg.telegram_chat_id = ae.telegram_chat_id
        WHERE ae.topic_id = ${topicId}
          AND ae.district_id = ${actorContext.districtId}
```
```
// apps/backend/src/modules/topics/topic-evidence-management-service.ts:154-157
      .leftJoin(
        acceptedEvidence,
        eq(acceptedEvidence.intakeRecordId, telegramIntakeRecords.id),
      )
```
```
// apps/backend/src/modules/topics/topic-evidence-management-service.ts:312-315
      const verbatimText = extractSignalVerbatimText(
        row.evidenceVerbatimText,
        row.intakeRawPayload,
      );
```

**Why it matters.** The module has no seam at which "this is the verbatim display text of this Accepted Evidence" is decided. Anything that must hold of verbatim text — privacy redaction, phone scrubbing, whitespace normalisation, retention-expiry wording — must be implemented twice and kept in sync by memory. The two reads are also reachable through route error mappers that disagree about status codes for the same failure (L3-P04-07), so one conceptual failure already presents differently to a Hokim and to the Product Owner.

**Deletion test.** Delete `getTopicEvidence`: the Hokim evidence route and the Product Owner district evidence route both lose their only implementation, and the ~174 lines of query, cursor, retention, deep-link, attribution and `isHokimRelated` logic would have to be re-created at two call sites (`hokim-topics-routes.ts:207`, `district-topics-routes.ts:185`). Complexity **reappears across two callers** — the function earns its keep; **candidate dropped as a deletion target**. Delete `listSignals`/`getSignalDetail`: the admin signal list and detail routes lose their only implementation and the ~445 lines reappear nowhere. **Candidate dropped.** Neither read module is shallow. What survives is the narrower claim that the *verbatim-resolution* sub-concern has no owner, filed separately as L3-P04-02.

**Fix direction.** Introduce one deep module whose interface is the verbatim-resolution concept and make it the only implementation. It should own payload-shape knowledge (which nested key holds the text, in which precedence order) and the terminal fallback strings, and expose one narrow function both the topic-scoped read and the intake-centric read call. Keep the two *query* modules separate: their row shapes, cursors and retention gates are genuinely different and merging them would widen the interface rather than deepen it. The seam belongs at payload resolution, not at SQL.

**Acceptance criteria.** (1) Exactly one backend implementation maps a stored intake `raw_payload` plus an optional `accepted_evidence.verbatim_text` to display text, and a grep for the terminal fallback `(Матн мавжуд эмас)` returns exactly one source hit. (2) Both `topic-evidence-management-service.ts:312` and `:496` call it, and the inline extraction in `promoteSignal` is removed. (3) A single unit test pins the precedence order for `{ message: { text: ... }, verbatimText: ... }` and asserts the same answer for every caller.

### L3-P04-05 — `topic-evidence-service.ts` is one deep read behind a wide shelf of helper exports

| Field | Value |
|---|---|
| Category | shallow-module |
| Severity | medium |
| Strength | worth-exploring |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/topic-evidence-service.ts:21`, `:46`, `:52`, `:56`, `:75`, `:89`, `:111`, `:149`, `:188` |

**Description.** The file declares 9 exports. One is a genuine deep module; the others widen the interface without carrying much behaviour.

`getTopicEvidence` (`:188`) is the deep one: four parameters in, a fully populated `TopicEvidenceResponse` out, and behind it sit district-scoped topic validation with retention and status gates, a bidirectional keyset cursor with a three-column tiebreaker, a parallel count/projection/settings fan-out, `isAnchor` correlation against the projection, per-row Hokim-term matching, and deep-link plus attribution sanitization. That is real leverage.

The other eight are not like that:

- `encodeEvidenceKeysetCursor` (`:52`) is a **pass-through** — its whole body is one delegation to the contract's `encodeKeysetCursor`.
- `decodeEvidenceKeysetCursor` (`:56`) does add real validation (shape, non-empty `msgId`/`id`, parseable date), so it earns its keep.
- `EvidenceKeysetCursorPayload` (`:46`) is a type alias over the contract's `KeysetCursorPayload`.
- `TopicNotFoundError` (`:75`) is a 9-line error class — see L3-P04-10.
- `formatTashkentDateTime` (`:89`), `resolveTelegramDeepLink` (`:111`), `sanitizeSenderAttribution` (`:149`) and `buildHokimTermsRegex` (`:21`) are small pure functions with genuine logic, all used by `getTopicEvidence`.

All eight are **exported**, so a caller wanting only `getTopicEvidence` still faces a nine-symbol interface. Two of them have their own test files, which is the honest reason they are exported.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topic-evidence-service.ts:52-54
export function encodeEvidenceKeysetCursor(timestamp: string, msgId: string, id: string): string {
  return encodeKeysetCursor<EvidenceKeysetCursorPayload>({ t: timestamp, msgId, id });
}
```
```
// apps/backend/src/modules/topics/topic-evidence-service.ts:188-193
export async function getTopicEvidence(
  db: DbClient,
  actorContext: { id: string; districtId: string; role: string },
  topicId: string,
  query: TopicEvidenceQueryOutput,
): Promise<TopicEvidenceResponse> {
```

**Why it matters.** The interface is wider than the behaviour justifies. A reader cannot tell from the export list which symbol is the module's reason to exist and which exist only so a unit test can reach them. The `actorContext` parameter compounds it: it is an inline anonymous type accepting `{ id, districtId, role }`, of which the function reads exactly one field (`districtId`, at `:194` and `:235`), while `hokim-topics-routes.ts:209` passes a full session actor and `district-topics-routes.ts:187` passes the fabricated literal `{ id: 'product_owner', districtId, role: 'PRODUCT_OWNER' }`.

**Deletion test.**

| Export | Delete, then complexity vanishes or reappears? | Verdict |
|---|---|---|
| `encodeEvidenceKeysetCursor` | Vanishes: one line, and `encodeKeysetCursor` is directly importable from the contract. No call site needs it (the routes pre-check with the decode side). | **Shallow — record and drop** |
| `decodeEvidenceKeysetCursor` | Reappears: both routes pre-validate with it (`district-topics-routes.ts:167`, `hokim-topics-routes.ts:197`) *and* the service re-validates at `:202`. | Keep — but the double validation is L3-P04-06 |
| `formatTashkentDateTime` | Reappears: the only Tashkent display formatting on this path. | Keep |
| `resolveTelegramDeepLink` | Reappears: the 3-tier `-100`/`-`/numeric chat-id algorithm has no other home. | Keep |
| `sanitizeSenderAttribution` | Reappears: it is the AD-11 privacy gate on this path. | Keep |
| `buildHokimTermsRegex` | Reappears: the Cyrillic `ҳ`/`х` normalisation has no other home. | Keep |
| `EvidenceKeysetCursorPayload` | Vanishes (type alias). | **Shallow — record and drop** |
| `getTopicEvidence` | Reappears at two routes. | Keep — the deep module |

Two exports are shallow. The deeper issue is interface width, not dead code.

**Fix direction.** Narrow the interface to the one symbol callers need. Move `resolveTelegramDeepLink`, `sanitizeSenderAttribution`, `formatTashkentDateTime` and `buildHokimTermsRegex` into a sibling module that `getTopicEvidence` imports, and stop exporting them from the service; the two test files import the sibling instead. Delete `encodeEvidenceKeysetCursor` and the payload alias in favour of the contract's own `encodeKeysetCursor<EvidenceKeysetCursorPayload>`. Replace the inline `actorContext` type with a named single-field parameter (`districtId: string`) so the interface states what the implementation consumes.

**Acceptance criteria.** (1) `topic-evidence-service.ts` exports at most `getTopicEvidence`, `TopicNotFoundError` and `decodeEvidenceKeysetCursor`. (2) No exported function in the file is a one-line delegation to a contract function. (3) `getTopicEvidence`'s signature names every value it reads.

### L3-P04-06 — The evidence read is guarded by validation duplicated across three layers

| Field | Value |
|---|---|
| Category | leaky-seam |
| Severity | medium |
| Strength | strong |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/district-topics-routes.ts:166`, `apps/backend/src/modules/topics/district-topics-routes.ts:177`, `apps/backend/src/modules/topics/topic-evidence-service.ts:201`, `apps/backend/src/modules/topics/hokim-topics-routes.ts:196` |

**Description.** The same preconditions are checked more than once on the way to one read, and the checks disagree about what a violation means.

1. **Cursor validity.** `district-topics-routes.ts:166-174` decodes the cursor and returns `400 INVALID_CURSOR` if it fails. Then `getTopicEvidence` decodes the *same* cursor again at `topic-evidence-service.ts:201-205` and throws a plain `Error` if it fails. `hokim-topics-routes.ts:196-204` performs the same pre-check but returns `400 VALIDATION_ERROR` — a different code for an identical condition. Three sites, two codes, one condition.
2. **District existence.** `district-topics-routes.ts:177-183` runs `db.query.districts.findFirst` and throws `DistrictNotFoundError` immediately before calling `getTopicEvidence`, which independently validates `topics.districtId = actorContext.districtId` at `:235`. The four other district endpoints get their District guarantee from `topic-query-engine.ts`; only the evidence endpoint double-checks.
3. **Topic id emptiness.** Both routes return `400 VALIDATION_ERROR` for a blank id, but the district route's parameter is `:topicId` while the hokim route's is `:id`, so the two paths do not describe the same resource identically.

The layer that should own the invariant is the service. It already owns it; the routes re-assert it in a way the service cannot observe, so the service's own cursor error branch is unreachable through HTTP.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/district-topics-routes.ts:166-174
        const { cursor } = req.query;
        if (cursor && !decodeEvidenceKeysetCursor(cursor)) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_CURSOR',
              message: 'Курсор нотўғри ёки муддати ўтган.',
            },
          });
        }
```
```
// apps/backend/src/modules/topics/topic-evidence-service.ts:201-205
  if (query.cursor) {
    const decoded = decodeEvidenceKeysetCursor(query.cursor);
    if (!decoded) {
      throw new Error('Курсор нотўғри ёки муддати ўтган.');
    }
```
```
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
```
// apps/backend/src/modules/topics/district-topics-routes.ts:177-183
          const district = await db.query.districts.findFirst({
            where: eq(districts.id, districtId),
          });

          if (!district) {
            throw new DistrictNotFoundError('Туман топилмади.');
          }
```

**Why it matters.** Three observable consequences. An invalid cursor produces two different client codes on two endpoints of the same feature. The duplicate district lookup at `:177` costs an extra round-trip on every evidence request and re-implements a check the service performs from its own query. And because the routes pre-validate, the service's plain-`Error` cursor branch at `:204` is unreachable through HTTP, so the untyped error mode in L3-P04-07 has no route-level cover.

**Deletion test.** Delete both route-level cursor pre-checks: the invalid cursor still yields HTTP 400, because the service throws and both mappers handle it (L3-P04-07). No complexity reappears at the call sites; the invariant stays owned by one module. **DISSOLUTION for the cursor checks.** Delete the route-level District check at `:177-183`: the engine still guards the three sibling endpoints, and the evidence endpoint keeps its 404 because the service's `topicRow` gate yields `TopicNotFoundError`. **Partial dissolution** — the duplicated `findFirst` disappears, but the distinct `404 DISTRICT_NOT_FOUND` for an unknown District is lost, so this needs a decision rather than a mechanical delete.

**Fix direction.** Let the service own cursor validity and the District/Topic gate, and give it typed errors for both (L3-P04-07) so each route maps them consistently. If the product genuinely wants `DISTRICT_NOT_FOUND` distinct from `NOT_FOUND` on this endpoint, that distinction belongs inside the service, not on the line above its call.

**Acceptance criteria.** (1) No route handler calls `decodeEvidenceKeysetCursor` before `getTopicEvidence`. (2) Both evidence endpoints return the same error code for the same invalid cursor. (3) The evidence endpoint issues at most one `districts` existence query per request.

### L3-P04-07 — Two of the four failure modes raise plain `Error`, so the two route mappers diverge

| Field | Value |
|---|---|
| Category | error-handling |
| Severity | medium |
| Strength | strong |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/topic-evidence-service.ts:195`, `apps/backend/src/modules/topics/topic-evidence-service.ts:204`, `apps/backend/src/modules/topics/hokim-topics-routes.ts:229`, `apps/backend/src/modules/topics/district-topics-routes.ts:248` |

**Description.** The evidence read can fail four ways. Two carry a `statusCode`, two do not, and the two route mappers disagree about the untyped ones.

| Failure | Site | Error | `statusCode`? | District route result | Hokim route result |
|---|---|---|---|---|---|
| Actor has no District | `:195` | plain `Error` | **no** | rethrown, Fastify 500 | `400 EVIDENCE_QUERY_ERROR` |
| Cursor invalid | `:204` | plain `Error` | **no** | rethrown, Fastify 500 | `400 EVIDENCE_QUERY_ERROR` |
| Topic missing/expired/inactive | `:276` | `TopicNotFoundError` | 404 | `404 NOT_FOUND` | `404 NOT_FOUND` |
| Settings lookup fails | `:272` | whatever the repository throws | unknown | generic or rethrow | `400 EVIDENCE_QUERY_ERROR` |

So the same missing-District condition returns HTTP 500 with a Fastify default body on the Product Owner route and HTTP 400 `EVIDENCE_QUERY_ERROR` on the Hokim route. Neither is correct: it is a client or authorization condition, not an internal error and not a malformed query.

The Hokim mapper compounds it by treating *every* non-404 failure as `400 EVIDENCE_QUERY_ERROR` — a genuine database outage would be reported to the Hokim as a bad request. The district mapper's only typed branch is `TopicNotFoundError`; anything else without a `statusCode` is rethrown at `:248`, so a repository failure becomes an unhandled 500 with no log line in the handler.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topic-evidence-service.ts:194-196
  if (!actorContext.districtId) {
    throw new Error('Ҳоким ҳисоби туманга бириктирилмаган.');
  }
```
```
// apps/backend/src/modules/topics/hokim-topics-routes.ts:229-236
          const message =
            err instanceof Error ? err.message : 'Далилларни юклашда хатолик юз берди.';
          return reply.status(400).send({
            error: {
              code: 'EVIDENCE_QUERY_ERROR',
              message,
            },
          });
```
```
// apps/backend/src/modules/topics/district-topics-routes.ts:246-248
    return reply.status(statusCode).send({
      error: { code, message },
    });
  }

  throw err;
```

**Why it matters.** This is the split-brain of L3-P04-01 made concrete at the transport layer. The module already has a typed-error vocabulary — `DistrictNotFoundError` (`DISTRICT_NOT_FOUND`), `DistrictRequiredError` (`DISTRICT_REQUIRED`), `InvalidCursorError` (`INVALID_CURSOR`), `TopicNotFoundError` (`NOT_FOUND`), `SignalNotFoundError` (`SIGNAL_NOT_FOUND`) — and the evidence read uses none of it for two of four failure modes. Both are misreported, and differently to two different actors. It also leaks internal text: a database driver's `err.message` would be forwarded verbatim to the Hokim under a `400`, because that mapper never logs before replying.

**Deletion test.** Replace the two plain `Error` throws with existing typed errors: no complexity reappears at either call site, because both mappers already have branches for typed errors (`hokim-topics-routes.ts:216-228` handles 404; `district-topics-routes.ts:231-246` handles any numeric `statusCode`). The change is additive at the throw sites and needs no new handling. **DISSOLUTION confirmed** — the plain `Error` throws are shallow; they carry a message and nothing else.

**Fix direction.** Give the service a closed set of typed errors for all four modes: a District-binding failure (`DistrictRequiredError`, 400), an invalid cursor (`InvalidCursorError`, 400), the not-found case (`TopicNotFoundError`, 404), and let genuine infrastructure failures propagate untyped so the mapper can log and return 500. Make the Hokim mapper mirror the district mapper's `statusCode`-keyed branch instead of defaulting to 400, and log before replying on the 5xx path. Reuse the engine's existing classes rather than declaring new ones (L3-P04-10).

**Acceptance criteria.** (1) Every `throw` inside `topic-evidence-service.ts` is either an instance carrying numeric `statusCode` and string `code`, or a deliberate untyped rethrow from a dependency. (2) For a missing District binding, both evidence endpoints return the same status and code. (3) No route handler returns 400 for a failure it cannot attribute to the request; a repository failure yields 500 and emits a log line.

### L3-P04-08 — `admin-signals-routes.ts` repeats per-route preconditions and keeps its own error taxonomy

| Field | Value |
|---|---|
| Category | leaky-seam |
| Severity | medium |
| Strength | worth-exploring |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/admin-signals-routes.ts:35`, `:124`, `:133`, `:95` |

**Description.** The file is mostly a transport adapter, and its call sites are thin: each handler destructures `params.id`, calls one service function, and replies. But three things it owns belong behind the seam.

1. **Infrastructure precondition, six times.** Six of the eight handlers repeat an identical `if (!pool || !boss)` guard returning `500 SERVER_MISCONFIGURED`. This asserts that the deployment wired a queue — a fact `withTransactionalIntake` already depends on — and could be asserted once at registration instead of six times per request.
2. **Identity precondition, six times.** The same six handlers repeat `if (!req.actor)` returning `401`. `createRequireProductOwner(db)` is already registered as a `preHandler` (`:70`), so this is a second, weaker copy that cannot fire when the hook works, and it invents `UNAUTHORIZED` rather than the `UNAUTHENTICATED` used at `hokim-topics-routes.ts:181`.
3. **Error taxonomy.** `handleSignalError` (`:35-60`) is a second mapper in the module, parallel to the evidence mappers, with its own code strings. It collapses everything unrecognised into `500 INTERNAL_ERROR` while forwarding `err.message` to the client.

It also hand-rolls validation: the `getSignalDetail` handler (`:95-102`) checks `id` for emptiness and returns `404 SIGNAL_NOT_FOUND`, even though the route has no schema and the service throws the same error at `:443`. A blank id is a malformed request (400), not a missing Signal (404).

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/admin-signals-routes.ts:124-131
        if (!pool || !boss) {
          return reply.status(500).send({
            error: {
              code: 'SERVER_MISCONFIGURED',
              message: 'Сервер навбат тизимига уланмаган.',
            },
          });
        }
```
```
// apps/backend/src/modules/topics/admin-signals-routes.ts:133-141
        if (!req.actor) {
          return reply.status(401).send({
            error: {
              code: 'UNAUTHORIZED',
              message: 'Аутентификация талаб қилинади.',
              statusCode: 401,
            },
          });
        }
```
```
// apps/backend/src/modules/topics/admin-signals-routes.ts:94-101
        const { id } = req.params as { id: string };
        if (!id || typeof id !== 'string' || id.trim() === '') {
          return reply.status(404).send({
            error: {
              code: 'SIGNAL_NOT_FOUND',
              message: 'Сигнал топилмади.',
            },
          });
        }
```
```
// apps/backend/src/modules/topics/admin-signals-routes.ts:53-59
  req?.log.error({ err }, 'Admin signal operation failed');
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Кутилмаган хатолик юз берди.',
    },
  });
}
```

**Why it matters.** The route knows about `pg.Pool`, `PgBoss` and `req.actor` — all service-level concerns. The sixfold repetition means a change to the queue-wiring contract (say, a third required dependency) must be applied in six places, and a missed one fails at a different point than its siblings. The invented `UNAUTHORIZED` code sits alongside `UNAUTHENTICATED` elsewhere in the module, so the client must handle both for one condition. And forwarding `err.message` on the 500 path logs the detail *and* sends it to the client, which is one of two behaviours that should be chosen deliberately, not both.

**Deletion test.** Delete the `!req.actor` blocks: `createRequireProductOwner` still rejects unauthenticated callers before the handler runs, complexity **vanishes**, and the only visible change is a consistent code. **DISSOLUTION.** Delete the `!pool || !boss` blocks and assert the dependency at registration: the six copies vanish and one assertion replaces them. **DISSOLUTION**, with the caveat that `pool` and `boss` are currently optional on `AdminSignalsRoutesDeps` (`:29-33`), so the type must become required to move the check. Delete the inline `id` check at `:95-102`: the service throws `SignalNotFoundError` for a blank id anyway, so the 404 is preserved. **DISSOLUTION** — but it also removes the chance to correct 404 to 400.

**Fix direction.** Move the identity check entirely into the `preHandler` hook and delete the six copies. Make `pool` and `boss` required on `AdminSignalsRoutesDeps` and assert them once at registration. Add a `signalIdParamSchema` to the contracts and attach it as `params` on the `:id` routes so a blank id is rejected as 400 by the same mechanism the other routes use for bodies. Fold `handleSignalError` into one module-wide mapper keyed on `statusCode`/`code`, and on the 500 path send a fixed message while logging the detail.

**Acceptance criteria.** (1) No handler in `admin-signals-routes.ts` inspects `req.actor` or `pool`/`boss`; both are asserted once. (2) The unauthenticated code string appears exactly once in the module. (3) A blank `:id` yields 400, and the 500 response body contains no dependency-derived message.

### L3-P04-09 — "Pending" is stored as a UI sentence and detected by string equality in four frontend call sites

| Field | Value |
|---|---|
| Category | leaky-seam |
| Severity | medium |
| Strength | strong |
| Confidence | high |
| Verification | observed |
| Location | `packages/api-contracts/src/topics.ts:27`, `packages/api-contracts/src/topics.ts:29`, `apps/backend/src/modules/topics/topic-evidence-service.ts:293`, `apps/backend/src/modules/topics/topic-query-engine.ts:314`, `apps/web/src/components/topics/TopicSummaryBody.tsx:30` |

**Description.** The contract declares a UI sentence as a constant and exports a predicate that recognises it by exact equality. That predicate is the *only* mechanism by which any consumer can tell a synthesised Topic apart from one whose projection has not yet been written. There is no status field: `TopicCardItemSchema` (`topics.ts:33-50`) has `summary: z.string()` and nothing that expresses "this Topic has no projection yet".

The result is that a display string is load-bearing control flow. Four frontend call sites branch on it, and the branches decide whether to render a skeleton, a delayed warning, or the real summary.

**Verbatim evidence.**
```
// packages/api-contracts/src/topics.ts:27-31
export const PENDING_TOPIC_SUMMARY_TEXT = 'Мавзу хулосаси тайёрланмоқда...';

export function isTopicSummaryPending(summary: string): boolean {
  return summary === PENDING_TOPIC_SUMMARY_TEXT;
}
```
```
// apps/web/src/components/topics/TopicSummaryBody.tsx:30
  const isPending = isTopicSummaryPending(props.summary);
```
```
// packages/api-contracts/src/topics.ts:38
  summary: z.string(),
```
The backend writes the literal into responses in two places, **neither of which imports the constant**:
```
// apps/backend/src/modules/topics/topic-evidence-service.ts:293
    summary: projectionRow?.summary ?? 'Мавзу хулосаси тайёрланмоқда...',
```
```
// apps/backend/src/modules/topics/topic-query-engine.ts:314
      COALESCE(tp.summary, 'Мавзу хулосаси тайёрланмоқда...') AS summary, 
```

Both `topic_projections.summary` (`apps/backend/src/adapters/db/schema/topic-projections.ts:20`) and `accepted_evidence.verbatim_text` (`apps/backend/src/adapters/db/schema/accepted-evidence.ts:26`) are `notNull()`, so a NULL summary here means "no projection row yet", not "the projection is empty". The domain fact encoded is therefore exactly "no projection row exists", and a column already expresses it — the absence of the 1:1 row (`uniqueIndex('topic_projections_topic_id_idx').on(table.topicId)`, `topic-projections.ts:45`), while `generation` and `requiredDerivedGeneration` express "a newer projection is being computed".

**Why it matters.** The sentinel conflates three distinct states into one string: no projection has ever been computed; a projection is being recomputed after an edit; and a legacy row whose summary happens to equal the sentence. The frontend cannot distinguish them, so all three render as a skeleton. The string is also duplicated three times — twice in backend literals that do not reference the constant, once in the contract — so changing the constant's wording silently breaks the predicate for every real response. `TopicSummaryBody`'s timeout logic (`:21-27`, `:60-89`) then measures elapsed time from `createdAt` to decide whether to show the delayed warning, which is a *fourth* state decision made on the client from a timestamp rather than from the server's actual projection state. The frontend components that consume this are `TopicSummaryBody.tsx:4,30`, `TopicCard.tsx:15,186` and `DistrictTopicsTable.tsx:15,58,198`.

**Deletion test.** Delete `PENDING_TOPIC_SUMMARY_TEXT` and `isTopicSummaryPending`: the four web call sites must each re-implement the equality test, so complexity **reappears across four call sites**. The constant/predicate pair is therefore **earning its keep as a shared convention** — deleting it is the wrong move. What fails the deletion test is the *absence of a status field*: add `isPending: boolean` to `TopicCardItem` and the predicate becomes derivable from typed data, at which point deleting it reappears nowhere. **Recorded outcome: the constant survives; the sentinel-as-state is the shallow part.**

**Fix direction.** Add an explicit projection-state field to `TopicCardItem` — a boolean `isPending` suffices, or an enum if the recompute case matters to the Hokim. Populate it from the `LEFT JOIN` in both query paths (`topic-query-engine.ts:305-336`, `topic-evidence-service.ts:240-242`) and from the generation comparison where a recompute is in flight. Keep `summary` as a display string read only when `isPending` is false, or make it nullable so the absence is visible in the type. If the sentence is still wanted as a fallback, keep it as a frontend render constant, not a backend data value. Then delete `isTopicSummaryPending` and let the call sites branch on the typed field.

**Acceptance criteria.** (1) `TopicCardItem` carries a field distinguishing a synthesised Topic from one whose projection is absent, and no consumer infers that from `summary`. (2) The literal `Мавзу хулосаси тайёрланмоқда...` appears zero times in `apps/backend/src`. (3) A projection that is mid-recompute is distinguishable from one that has never existed.

### L3-P04-10 — `TopicNotFoundError` is declared twice with different `code` values and an inert field

| Field | Value |
|---|---|
| Category | duplication |
| Severity | low |
| Strength | strong |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/topic-query-engine.ts:68`, `apps/backend/src/modules/topics/topic-evidence-service.ts:75`, `apps/backend/src/modules/topics/district-topics-routes.ts:22`, `apps/backend/src/modules/topics/hokim-topics-routes.ts:24` |

**Description.** Inherited from the previous phase and **confirmed independently in this scope**. Two classes share the name `TopicNotFoundError`, agree on `statusCode = 404`, and disagree on `code`: the engine's says `TOPIC_NOT_FOUND`, the evidence service's says `NOT_FOUND`.

Both route files import the **evidence-service** copy — `district-topics-routes.ts:22-26` and `hokim-topics-routes.ts:24-28` both list `TopicNotFoundError` from `'./topic-evidence-service.js'`. Nothing imports the engine's copy, and `new TopicNotFoundError` appears exactly once in the repository, at `topic-evidence-service.ts:276`. The engine's class is never instantiated.

The observed consequence: the code that reaches the client is `NOT_FOUND` — but not because the class's `code` field is read. `district-topics-routes.ts:207-211` hardcodes the string in the response instead of reading `err.code`, so the class's own `code` property is inert on this path.

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
```
```
// apps/backend/src/modules/topics/topic-evidence-service.ts:75-77
export class TopicNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = 'NOT_FOUND';
```
```
// apps/backend/src/modules/topics/district-topics-routes.ts:207-211
  if (err instanceof TopicNotFoundError) {
    return reply.status(404).send({
      error: { code: 'NOT_FOUND', message: err.message },
    });
  }
```
```
// apps/backend/src/modules/topics/hokim-topics-routes.ts:222-227
            return reply.status(404).send({
              error: {
                code: 'NOT_FOUND',
                message,
              },
            });
```

**Why it matters.** Two exports with one name is a hazard for the next reader, who may import the wrong one and get a `code` the client does not expect. The evidence path's `code` field is inert, so the class's contract is a fiction: it advertises `NOT_FOUND` and the routes independently assert `NOT_FOUND`. If either changes they can diverge with no test failure, because the route never reads the field. Severity is `low` because the observable HTTP behaviour today is correct and consistent; the cost is maintainer confusion plus a latent divergence.

**Deletion test.** Delete the engine's class at `topic-query-engine.ts:68-75`: no import breaks and no complexity reappears, since a grep for `new TopicNotFoundError` yields only `topic-evidence-service.ts:276`. **DISSOLUTION.** Separately, make the routes read `err.code` instead of hardcoding `NOT_FOUND`: the class's field becomes load-bearing and the duplicated literal disappears. **DISSOLUTION** for the literal. The direction is not symmetric — deleting the *evidence-service* class instead would break two route imports.

**Fix direction.** Keep one declaration. Since "not found" on this path is a Topic-read concept, delete the engine's copy and re-export nothing; if the engine later needs it, import the surviving class. Then remove the hardcoded `NOT_FOUND` in `district-topics-routes.ts:209` and `hokim-topics-routes.ts:224`, reading `err.code` so a single declaration owns the client-visible string. This also aligns with the ADR-0001 hexagonal boundary: error vocabulary shared across a module's reads belongs to one place, not one per file.

**Acceptance criteria.** (1) Exactly one `TopicNotFoundError` class exists in `apps/backend/src/modules/topics`. (2) No route handler contains a hardcoded `NOT_FOUND` literal for the evidence path. (3) Changing the class's `code` changes the client-visible code with no other edit.

## PENDING_TOPIC_SUMMARY_TEXT writer (assigned sub-question)

The inherited sub-question was: find where the backend persists the literal `'Мавзу хулосаси тайёрланмоқда...'` into the `summary` field, and whether a status or flag field already exists that could express "pending" without storing a UI sentence as data. Both halves are answered below with verbatim evidence.

### Answer 1 — the literal is never *persisted*. It is a read-time fallback, written twice as a duplicate literal.

There is no backend writer that stores this sentence in `topic_projections.summary`. The literal appears in exactly **two** backend source locations, and both are read paths that fabricate the value at response time:

```
// apps/backend/src/modules/topics/topic-evidence-service.ts:293
    summary: projectionRow?.summary ?? 'Мавзу хулосаси тайёрланмоқда...',
```
```
// apps/backend/src/modules/topics/topic-query-engine.ts:314
      COALESCE(tp.summary, 'Мавзу хулосаси тайёрланмоқда...') AS summary, 
```

`topic-evidence-service.ts:293` is the `??` fallback in the `TopicCardItem` built by `getTopicEvidence`. `topic-query-engine.ts:314` is the `COALESCE` in the topic-board SQL. Neither imports `PENDING_TOPIC_SUMMARY_TEXT` from the contracts package, so the constant is a third, unreferenced declaration of the same string.

The *actual* writer of `topic_projections.summary` is the projection job, which writes whatever the AI evaluator produced:

```
// apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:249
                    summary: evaluation.summary,
```

and `evaluation.summary` is the validated model output (`topic-projection-evaluator.ts:576`, `summary: data.summary`). So the sentence is never written by that path. It only ever appears because a projection row does not exist yet for the Topic being read.

A repo-wide grep for the Cyrillic literal returns six hits, and they are accounted for completely: `packages/api-contracts/src/topics.ts:27` (the constant), `apps/backend/src/modules/topics/topic-evidence-service.ts:293` and `apps/backend/src/modules/topics/topic-query-engine.ts:314` (the two backend fallbacks, neither importing the constant), `apps/backend/tests/hokim-topics.test.ts:537` and `:567` (a test that asserts the literal is the fallback: `expect(found.summary).toBe('Мавзу хулосаси тайёрланмоқда...')`), and `docs/architecture-review/phase-02-contract-domain-payloads.md:39` (a prior review artefact quoting it). **No backend source file imports `PENDING_TOPIC_SUMMARY_TEXT` or `isTopicSummaryPending`.** Their only real consumers are frontend: `apps/web/src/components/topics/TopicSummaryBody.tsx:4,30`, `apps/web/src/components/topics/TopicCard.tsx:15,186`, `apps/web/src/components/districts/topics/DistrictTopicsTable.tsx:15,58,198`, and `apps/web/tests/unit/TopicSummaryBody.test.tsx:4,25,42,60`.

### Answer 2 — the file itself supplies the reason the sentence never round-trips through persistence

`TopicSummaryBody.tsx:60-104` never renders the sentinel text to the user. When `isPending` is true it renders either a `<Skeleton>` (`data-testid="topic-summary-skeleton"`) or, once more than 60 seconds have elapsed since `createdAt`, a different sentence: `'Мавзу хулосаси кечикмоқда (хабарлар мавжуд)'` (`:85`). The `props.summary` string is only passed to `HighlightText` in the non-pending branch (`:120`).

So the literal functions purely as an in-band sentinel between backend and frontend, and the frontend strips it before display. This is why the prior phase could find no backend writer: there is none by design, and the constant is misnamed — it describes a *response fallback*, not stored data.

### Answer 3 — a status/flag field does not exist, but the information needed to derive one does

No pending/status/state field exists on the topic contract. `TopicCardItemSchema` (`packages/api-contracts/src/topics.ts:33-50`) contains `summary: z.string()` (`:38`) and has no boolean or enum that could express "projection not yet available". The nearest thing is `latestUpdate: z.string().nullable().optional()` (`:47`), which is a different concept (`topic-projections.ts:21` `latestUpdate: text('latest_update')`, nullable).

However the data needed to express it is already present in both query paths, because both read projections via a `LEFT JOIN` and already distinguish the missing-row case:

- `topic-query-engine.ts:322-324` — `FROM topics t LEFT JOIN topic_projections tp ON tp.topic_id = t.id`, with the fallback applied at `:314`.
- `topic-evidence-service.ts:240-242` — `db.query.topicProjections.findFirst({ where: eq(topicProjections.topicId, topicId) })`, whose `undefined` result is what `??` at `:293` catches.
- `topic-projections.ts:45` — `uniqueIndex('topic_projections_topic_id_idx').on(table.topicId)` guarantees at most one projection row per Topic, so "no row" is a well-defined state, not an ambiguous one.

A second, distinct state is also already modelled: `topics.requiredDerivedGeneration` versus the projection's generation. `topic-evidence-management-service.ts:932-936` and `:1069-1073` bump `requiredDerivedGeneration` on edit and on delete, and `reclassifyEvidence` compares generations at `:765` and `:844`. A recompute-in-flight state is therefore expressible today as `requiredDerivedGeneration > appliedDerivedGeneration` without adding a column. That distinction is currently invisible to the Hokim, who sees the same skeleton for "never computed" and "being recomputed after an edit".

### Answer 4 — what this means for the earlier phase's open question

The prior phase recorded the export pair as having no located writer and no consumer in the contract package's own consumers. Both observations are correct and now explained: there is no writer because the value is synthetic, and there is no *contract-package* consumer because the predicate's only consumers live in `apps/web`. The genuinely surprising part is the duplication — the same sentence is declared three times (once as a constant, twice as inline literals that do not reference it) — and that the predicate is the sole mechanism by which a synthesised Topic is distinguishable from a projected one. This is filed as **L3-P04-09**.

## Deferred to L6 (ADR-0006)

Per the ADR-ownership rule, tenant scoping is owned exclusively by a later layer. Recorded as one-line observations only, with no finding id and no severity:

- `getTopicEvidence` filters Accepted Evidence on `ae.district_id = ${actorContext.districtId}` and gates the Topic on `eq(topics.districtId, actorContext.districtId)` (`topic-evidence-service.ts:235`, `:249`, `:267`), while `district-topics-routes.ts:187` supplies a synthetic `{ id: 'product_owner', districtId, role: 'PRODUCT_OWNER' }` actor rather than the authenticated principal — the district boundary on the Product Owner route is carried by the path parameter, not by the actor.
- The admin Signal read paths carry no district predicate at all: `listSignals` filters on `query.districtId` only when the caller supplies it (`topic-evidence-management-service.ts:188-190`), and `getSignalDetail` matches on `id` alone (`:437-439`).
- Evidence keyset cursors are not tenant-scoped: `decodeEvidenceKeysetCursor` validates shape and timestamp but carries no district binding (`topic-evidence-service.ts:56-70`), unlike `decodeTopicKeysetCursor`, which additionally bounds cursor age to 90 days and rejects timestamps more than a minute in the future (`topic-query-engine.ts:88-110`).

## Residual uncertainty

Stated plainly, as required by the stopping rule.

1. **The L3-P04-03 mechanism is inferred, not executed.** I proved by reading that `promoteSignal`'s inline extractor (`topic-evidence-management-service.ts:607-620`) does not handle `rawPayload.message.text`, that walker #1 in the same file does (`:62-75`), and that the module's own search predicate queries `rawPayload->'message'->>'text'` (`:220`). I did **not** establish which payload shape the live intake path actually stores, and the reading suggests both may occur: `processWebhookUpdate` passes the raw Telegram update as `rawPayload` (`telegram-intake-service.ts:322`), whose text lives at `message.text`, while `promoteSignal` and `createManualSignal` write a **flat** `{ status, verbatimText, ... }` shape (`:1152-1157`). The `UNASSIGNABLE_VAGUE` purge path (`topic-assignment-coordinator.ts:656-666`) replaces the payload entirely with `{ status, reason, purgedAt }` and clears memory with `verbatimText = '` (`:668`). So the nested shape plausibly reaches `promoteSignal` for bot-ingested messages — which is what makes the misattributed "retention expired" message (L3-P04-03) reachable — but I could not confirm it without running the pipeline. That is why L3-P04-03 is marked `inferred` / `worth-exploring` rather than `observed`. **This is the single largest uncertainty in the phase, and it is the one finding whose severity could move upward if confirmed.**

2. **The retention sweeper was not traced end to end.** `apps/backend/src/modules/retention/debug-payload-retention.ts:21-36` purges `raw_payload` to a four-key object and its `WHERE` clause requires `raw_payload->>'verbatimText' IS NOT NULL` (`:35`) — which a flat-shape payload satisfies and a nested-shape payload does not. I read this file and its predicate, but I did not enumerate every retention job or confirm which shapes the sweeper can actually reach. A shape the sweeper cannot match would retain raw text past its window, which is outside this phase's question but adjacent to L3-P04-03.

3. **Only two of the four management-service "jobs" were examined for internal coupling.** I established the LOC distribution and the job grouping (L3-P04-04) by reading the export boundaries and each function's parameters and transaction usage. I did not read every line of `reclassifyEvidence`'s topic-merge cascade or `deleteEvidence`'s pg-boss purge statements closely enough to assert that the split I propose preserves all cross-function invariants. The proposed seams follow the existing export boundaries, which limits the risk, but a splitter should re-derive the invariant list before cutting.

4. **The listSignals N+1 was not measured.** `getSignalDetail` issues an additional `aiProviderAttempts` query per row (`topic-evidence-management-service.ts:522-536`), while `listSignals` does not — the list path therefore has no cost data. I did not attempt to quantify the per-request cost of the fan-out, so no `performance` finding is filed. It is recorded here as an unverified observation rather than a finding, per the rule against asserting what cannot be proved by reading.

5. **Files that yielded nothing.** Two scope files produced no finding of their own and are accounted for elsewhere: `admin-signals-routes.ts` yielded only L3-P04-08 (the route file is otherwise a clean adapter, and its handlers call one service function each), and `topic-evidence-service.ts` yielded L3-P04-05, L3-P04-07 and L3-P04-10 while `getTopicEvidence` itself is genuinely deep. No finding was invented for them.

6. **`pnpm --filter @mahalla-ovozi/backend exec tsc --noEmit` exits `0`** against HEAD `bdf999a`. Every finding in this phase is therefore a semantic or structural observation that the type checker cannot see; none is a compile error. No test suite was executed, per the phase constraints.

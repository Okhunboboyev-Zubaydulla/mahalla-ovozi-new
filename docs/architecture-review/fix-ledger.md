# Fix ledger — Tier 1 defects

**This is a separate program from the architecture review.** The review (`INDEX.md` and the `phase-*.md` artifacts) was read-only by decision. This ledger records the fixes that were subsequently approved and executed. It does not modify the review's findings; where a fix proved a finding wrong, the finding was corrected in place and the correction is noted below.

Baseline before this program: HEAD `bdf999a`. Scope approved: the four Tier 1 items from `fix-backlog.md`, with `L3-P05-16` bundled into Phase 3 because it shares a statement with `L3-P05-17`.

## Outcome

| # | Finding | File | Status |
|---|---|---|---|
| 1 | `L3-P04R-01` | `topic-evidence-management-service.ts` | **fixed** — and the *finding itself was corrected* (severity high → medium) |
| 2 | `L3-P05-01` | `topic-projection-evaluator.ts` | **fixed** — proven by a failing-then-passing test |
| 3 | `L3-P05-16` | `topic-projection-job-handler.ts` | **fixed** — proven by a failing-then-passing test |
| 4 | `L3-P05-17` | `topic-projection-job-handler.ts` | **fixed** |
| 5 | `L3-P05-10` | `topic-assignment-coordinator.ts` | **fixed** — but *not deterministically tested*; see Residual uncertainty |
| 6 | `L3-P05-02` | `ai-gateway.ts` + 3 evaluator schemas + `types.ts` | **fixed** — the *finding was confirmed and found stronger*; 3 artifact defects corrected (Phase 5) |
| 7 | `L3-P05-09` | `topic-assignment-coordinator.ts` + `jobs/topic-assignment-job-handler.ts` | **fixed** — *finding confirmed stronger*: two throw sites, not one (Phase 6) |
| 8 | `L3-P05-15` | `topic-assignment-coordinator.ts` | **fixed** — same pass as #7 (Phase 6) |
| 9 | *(unranked)* `is_hokim_related` tautology | `topic-projection-evaluator.ts` | **fixed** — now derived by the schema's `.transform` (Phase 7) |
| 10 | `L3-P03-01` | `topic-query-engine.ts` + `packages/api-contracts` + 6 web files | **fixed** — interface narrowed 28 → 9 exports; `L3-P03-02` closed, `L3-P03-03` partially closed (Phase 8) |

All ten were executed test-first: a failing test was written, run to confirm it failed for the recorded root cause, then the fix was applied and the test re-run green. Phase 8's web-side changes are the one exception — they were driven by compiler errors rather than a red test, and are recorded as such in that phase's residual uncertainty.

## Files changed

Source — Phases 1–4 (4):
- `apps/backend/src/modules/topics/topic-projection-evaluator.ts`
- `apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts`
- `apps/backend/src/modules/topics/topic-assignment-coordinator.ts`
- `apps/backend/src/modules/topics/topic-evidence-management-service.ts`

Tests — Phases 1–4 (4):
- `apps/backend/tests/topic-projection-evaluator.test.ts`
- `apps/backend/tests/topic-projection-reconciliation.test.ts`
- `apps/backend/tests/signal-management-crud.test.ts`
- `apps/backend/tests/worker-topic-assignment.test.ts`

Total for Phases 1–4: 500 insertions, 56 deletions across 8 files.

Source — Phase 5 (5):
- `apps/backend/src/modules/ai/ai-gateway.ts` (normalizer deleted)
- `apps/backend/src/modules/ai/types.ts` (contract declared on `GenerateStructuredOptions`)
- `apps/backend/src/modules/ai/semantic-relevance-evaluator.ts`
- `apps/backend/src/modules/topics/topic-matching-evaluator.ts`
- `apps/backend/src/modules/topics/topic-projection-evaluator.ts` (second touch, on top of Phase 2)

Tests — Phase 5 (4):
- `apps/backend/tests/ai-gateway.test.ts`
- `apps/backend/tests/semantic-relevance-evaluator.test.ts`
- `apps/backend/tests/topic-matching-evaluator.test.ts`
- `apps/backend/tests/topic-projection-evaluator.test.ts` (second touch)

No unrelated file was touched in any phase.

## Phase 1 — `L3-P04R-01`, promotion of structurally excluded messages

**The review's finding was partly wrong, and the fix program found that out before writing any code.**

The review claimed *"No producer writes either key at the payload root"* after tracing three producers. There are four. `apps/backend/src/modules/ai/jobs/semantic-relevance-job-handler.ts:728-744` merges a **flat** `{ status, exclusionReason, verbatimText, reasoning, expiresAt, purgedAt }` into `raw_payload` via `COALESCE(...) || ${exclusionMeta}::jsonb`. The review missed it because it writes through a **SQL template merge**, not an object literal, and the review's grep covered the intake module but not the `ai` module.

Consequences, as corrected:
- `promoteSignal` **worked** for semantically excluded messages (spam, chatter) — the common Product-Owner case, and the case the pre-existing test at `signal-management-crud.test.ts:399` exercises (its fixture is deliberately flat).
- It **failed** for **structurally** excluded messages, whose payload is the raw Telegram update with text at `raw_payload.message.text` (`qualification-job-handler.ts:125-129`, `burst-debounce-job-handler.ts:250-254`).
- The false retention message stood in that narrower case.

Severity corrected `high` → `medium` in `phase-04r-evidence-read-repair.md`, with a SCOPE CORRECTION block recording the miss and its cause. The finding's fix direction was unchanged and still correct.

**Red:** new test `4b.` in `signal-management-crud.test.ts` — a structurally excluded intake with a nested raw Telegram payload. Failed `404` instead of `200`.
**Fix:** `promoteSignal` now resolves text through the existing `extractSignalVerbatimText(null, intake.rawPayload)` — the same extractor the read paths use — instead of a root-level-only inline read. Added `EXTRACTED_TEXT_FALLBACK` as the single definition of the `(Матн мавжуд эмас)` sentinel. The error message no longer asserts a retention purge that was not verified.
**Green:** `tests/signal-management-crud.test.ts` — **19/19 pass**.

## Phase 2 — `L3-P05-01`, anchor index resolved against the wrong list

**Red, and the diagnostic was exact:**
```
AssertionError: expected 'evi_target_1' to be 'evi_target_6'
```
The prompt labelled `evi_target_6` as `Evidence #1` (20 items capped to the last 15); the guardrail resolved index `1` against the untruncated array and got `evi_target_1`. This is the first finding in the program confirmed by **execution** rather than by reading.

**Fix:** extracted `capTargetEvidenceForPrompt()` and `MAX_TARGET_EVIDENCE_IN_PROMPT = 15` as the single definition of the cap. `buildUserPrompt` and the post-generation guardrail now call the same function, so "the list the prompt labels" and "the list the index resolves against" cannot drift apart.
**Green:** `tests/topic-projection-evaluator.test.ts` — **47/47 pass**, including the 46 pre-existing cases.

## Phase 3 — `L3-P05-16` + `L3-P05-17`, projection failure telemetry

**Red, exactly as predicted:**
```
AssertionError: expected 'top_keygen_1c50d378:2' to be 'top_keygen_1c50d378:3'
```
The failure row was keyed on the job's generation (2) while the reconciliation sweep searches for the coalesced generation (3) — so the `TOPIC_PROCESSING_DELAY` alarm could never fire for a topic that fell behind.

**Fixes:**
- `L3-P05-16` — the failure path now records the **coalesced** `topicId:targetGeneration`, hoisted into `failureTargetId` so the success and failure paths build one key from one expression.
- `L3-P05-17` — provenance is no longer fabricated. `contextRevision` and `snapshotFingerprint` carry the **real** snapshot values when the run reached one, and explicit sentinels (`SNAPSHOT_FINGERPRINT_UNAVAILABLE = 'unavailable'`) otherwise, replacing the misleading `contextRevision: 0` / `snapshotFingerprint: 'error'`. The hardcoded profile id became the named `TOPIC_PROJECTION_PROFILE_ID` constant.
- `L3-P05-17` second arm — added `setWhere: sql`${aiOperations.finalStatus} <> 'COMPLETED'`` so a later failure cannot downgrade a committed projection's audit row to `FAILED`. (`setWhere` confirmed available in the installed drizzle-orm 0.45.2 at `pg-core/query-builders/insert.d.ts:66`.)

**Green:** `tests/topic-projection-reconciliation.test.ts` — **7/7 pass**; `tests/worker-topic-projection.test.ts` — **28/28 pass** (no regressions across the full projection matrix, including the pre-existing `TOPIC_PROCESSING_DELAY` and auto-resolve cases).

## Phase 4 — `L3-P05-10`, CAS guard on a different connection than the commit

The highest-risk change: it relocates a concurrency check, and a wrong relocation would turn a *too-weak* guard into a *too-aggressive* one that rejects legitimate assignments.

**Fix, two parts:**
1. The CAS verification moved from before the transaction to **inside** it, re-reading the snapshot through `tx` (`getMahallaDailySnapshot(tx as unknown as DbClient, ...)`). `withTransactionalIntake` does `pool.connect()` and `BEGIN` on a dedicated connection while `db` is the pool-backed client, so the guard and the commit now share one session instead of reading and writing through different ones.
2. The `UPDATE topics` gained a generation predicate — `.where(and(eq(topics.id, targetTopicId), eq(topics.requiredDerivedGeneration, targetTopicRecord.requiredDerivedGeneration)))` — with `.returning({ id })`, and a zero-row result throws the same `STALE_SNAPSHOT` signal the CAS check raises. Under READ COMMITTED the second writer blocks on the row lock, then re-evaluates the predicate against the committed value, no longer matches, and is rejected rather than silently overwriting.

The import of `assertSnapshotRevision` was removed (no longer used); `verifySnapshotIntegrity` is kept and still called.

**Test added to prove the predicate** (written after the initial four phases — see *Closing the `L3-P05-10` test gap* below). The test deliberately makes the CAS check **pass for both** concurrent assignments — both read an identical injected snapshot, so identical revision and fingerprint — which isolates the generation predicate as the only mechanism that can stop the lost update.

**Green:** `tests/worker-topic-assignment.test.ts` — **30/30 pass**, including Matrix #21 (CAS concurrency → `STALE_SNAPSHOT`), Matrix #27 (downstream projection enqueue), and the new `L3-P05-10` race test. `tests/{topic-evidence,district-topics,hokim-topics}.test.ts` — **39/39 pass**. Typecheck `tsc --noEmit` exit **0**.

## Verification summary

| Suite | Tests | Result |
|---|---|---|
| `topic-projection-evaluator.test.ts` | 47 | pass |
| `signal-management-crud.test.ts` | 19 | pass |
| `topic-projection-reconciliation.test.ts` | 7 | pass |
| `worker-topic-projection.test.ts` | 28 | pass |
| `worker-topic-assignment.test.ts` | 30 | pass |
| `topic-evidence` + `district-topics` + `hokim-topics` | 39 | pass |
| **Total** | **170** | **all pass** |

Instrument: `pnpm --filter @mahalla-ovozi/backend exec tsc --noEmit` → exit **0**. All suites ran against the isolated `mahalla_ovozi_test` database on port 5433. No full-repo suite was run.

## Residual uncertainty

- **`L3-P05-10`'s generation predicate is now proven, by falsification.** The earlier claim that it was untestable was **wrong** — see *Closing the `L3-P05-10` test gap* below.
- **The race test depends on timing, not a deterministic interleaving.** It makes the two assignments overlap by giving each an equal 50 ms mock AI latency. If the scheduler serialised them, the second would read generation 2 and its predicate would match even *without* the guard, so a green run could in principle be a false pass. Falsification rules this out for the run recorded here (guard removed → both committed, `fulfilled.length` 2), but the test is timing-sensitive rather than interleaving-forced. A deterministic version would need a barrier injected between the candidate read and the `UPDATE`.
- **`L3-P05-10`'s relocation changes timing.** The CAS check now runs after `pool.connect()` and `BEGIN` rather than before, so a stale-snapshot rejection holds a connection briefly longer and rolls back instead of throwing before the transaction. Semantics for the caller are unchanged (still a throw → pg-boss retry), and all 29 assignment tests pass, but the connection-hold duration is slightly longer under contention. Not measured.
- **`L3-P04R-01`'s remaining producers were not exhaustively ruled out.** The four known writers of `telegram_intake_records.raw_payload` are now accounted for, but test fixtures, seeds, and CLI import paths were not audited. The new test uses the real nested shape, so the common production path is covered.
- **`L3-P05-17`'s `setWhere` guard is tested only indirectly.** No test asserts that a `COMPLETED` row survives a subsequent failure for the same natural key. The behaviour follows from the predicate, but it is not pinned by a test.
- **Not addressed (by design):** the remaining `fix-backlog.md` items — `L3-P05-02` (gateway rewrites evaluator payloads before `safeParse`), `L3-P03-*`, the `L1-*` contract findings, and the medium-severity items. They remain in the backlog, unauthorised.

## Closing the `L3-P05-10` test gap

The ledger originally recorded this predicate as **unproven by execution**, on the reasoning that there is no injection seam between the candidate read and the `UPDATE`. That reasoning was wrong. `topic-assignment-coordinator.ts:243-249` consults `deps.injectedEvidenceResolver` for the **initial** snapshot, and the in-transaction CAS re-read consults it again — so a resolver returning a fixed list makes both concurrent assignments compute the *same* `initialRevision` and `initialFingerprint`. The CAS check then passes for both, and the generation predicate becomes the only thing standing between them.

The test (`L3-P05-10: two concurrent assignments against one Topic cannot both commit`):
- seeds one Topic at `requiredDerivedGeneration: 1` and two intake records with **distinct** `telegramMessageId`s (identical ids collide on the `telegram_intakes_district_chat_msg_idx` unique index *and* would make the coordinator's idempotency stage short-circuit the second call as `SKIPPED_DUPLICATE` instead of racing it);
- points the injected resolver at a fixed one-item snapshot, so both calls read the same revision and fingerprint;
- gives each call an equal 50 ms mock latency so both are in flight together;
- asserts exactly one fulfilment, one `STALE_SNAPSHOT` rejection, `requiredDerivedGeneration` advanced exactly once (1 → 2), and exactly **one** row of Accepted Evidence.

**Falsified, not merely passed.** With the generation predicate temporarily removed and replaced by an unguarded `.where(eq(topics.id, targetTopicId))`, the test failed as required:
```
AssertionError: expected 2 to be 1 // Object.is equality
  expect(fulfilled.length).toBe(1)
```
Both assignments committed — the lost update, reproduced. Restoring the predicate returned the suite to 30/30. A green test that cannot be made to fail proves nothing; this one was made to fail first.

## Phase 5 — `L3-P05-02`, the gateway rewrote evaluator payloads before `safeParse`

**The finding was confirmed against source, and it is stronger than recorded.** `ai-gateway.ts:231-257` mutated `parsedJson` ahead of `options.schema.safeParse(parsedJson)` at `:260`. All four branches were re-read and quoted. Two of the review's own claims needed correction:

1. **The review missed a second dead refine.** It reported that `topic-matching-evaluator.ts:97-120`'s `primary_lane` / `matched_topic_id` arms were unreachable. Correct — but `topic-projection-evaluator.ts:125-132`'s refine (`is_hokim_related === lanes.includes('HOKIM_RELATED')`) was *equally* unreachable, because `ai-gateway.ts:255` set that field unconditionally from `lanes` before the parse. Same defect, unrecorded.
2. **Acceptance criterion (3) was self-contradictory.** It asked that the matching `.refine` be "reachable **in production** for at least one of its consistency arms", while the finding's own deletion test concluded the coercion must be **preserved**. Preserving it necessarily keeps those arms pre-empted. The criterion is restated as **reachable from the evaluator's own test suite**, which the delivered tests satisfy. Recorded rather than silently reinterpreted.

**Deliberate or accidental?** Both, on different axes — which is why the fix relocates rather than removes:
- The **intent is deliberate and load-bearing.** The comment at `:231` documents real LLM misbehaviour, and `reasoning` is `.max(300)` in both schemas while the gateway sliced at 300 chars, so removal would convert recoverable output into `INVALID_OUTPUT_SEMANTICS` across 3 paid retries. The finding's deletion test ("survives — the normalizer earns its keep, in the wrong module") is correct.
- The **placement and scope are accidental.** `git blame -L 231,256` attributes every line to a single commit, `d9b357b` (2026-09-01, "fix(ai-topics): calibrate pragmatic intent, anchor genesis, thread continuity, and drawer sync") — a behavioural bug fix, not a contract decision. The comment names only the `is_relevant` / `reasoning` group; the `decision`, `lanes` and `is_hokim_related` branches are undocumented. `ai-gateway.test.ts`'s `TestSchema` (`:15-19`) shares **no field name** with any branch, so the normalizer had **zero** direct test coverage.

**Contract confirmed with the user before any edit** (option A of three): relocate each contract-specific coercion into the evaluator that owns the schema, leaving only provider-generic cleanup in the gateway. Options B (keep it in the gateway behind a declared per-`operationType` registry) and C (remove it) were rejected — C by the finding's own deletion test.

### Fix — four relocations, each test-first

| Branch deleted from `ai-gateway.ts` | New home |
|---|---|
| `:233-235` slice `reasoning` > 300 | `semantic-relevance-evaluator.ts` `SemanticRelevanceResultSchema`; already present at `topic-matching-evaluator.ts:32-34`; not applicable to the projection schema (no `reasoning` field) |
| `:236-244` `is_relevant` ⇄ `exclusion_reason` / `relevant_lanes` | `semantic-relevance-evaluator.ts:29` — object+refine wrapped in `z.preprocess` |
| `:245-252` `decision` → null-out | appended to the **existing** preprocess at `topic-matching-evaluator.ts:28-77` (no nested preprocess) |
| `:253-256` `lanes` dedupe + `is_hokim_related` derive | `topic-projection-evaluator.ts:56` — object+refine wrapped in `z.preprocess`. Dedupe was **already** duplicated by `.transform(...)` at `:67`; only the `is_hokim_related` derivation was new |

The contract is now **declared in the code**, not merely relocated: a doc comment on `GenerateStructuredOptions` in `apps/backend/src/modules/ai/types.ts` states that the gateway validates exactly what the model returned and that a schema needing quirk-tolerance owns it via its own `z.preprocess`.

**Compiler compatibility** was checked before relying on it: `schema-compiler.ts:35-36` unwraps `z.ZodEffects` via `current.innerType()`, so a `z.preprocess` wrapper compiles transparently. Already proven in production by the pre-existing `TopicMatchingResultSchema`.

### Red → green, per slice

All four slices followed red-green. Every red was confirmed to fail for the recorded reason before the source changed:

- **Slice 1 (matching)** — red: 3 failures, `expected false to be true`; the refine rejected the payload because nothing coerced it yet. Green: **46/46**.
- **Slice 2 (projection)** — red: 3 failures, `ZodError` carrying the exact refine message. Green: **49/49**.
- **Slice 3 (semantic relevance)** — red: 4 failures. Green: **93/93**.
- **Slice 4 (gateway)** — red: 1 failure whose output showed `"primary_lane": null` **in the returned data**. That is the finding reproduced by execution: the gateway repaired a caller-owned field and the parse succeeded. Green: **17/17**.

**Stale specifications corrected, not weakened.** Eight pre-existing assertions encoded the belief that the schemas *reject* payloads the normalizer used to coerce. In production those payloads were never rejected, so those assertions described unreachable behaviour — the exact defect under repair. They were converted to assert the production-true behaviour. This is a specification correction, not a test weakening, and it is bounded: **five new over-coercion guards were added in the same edit** (matching: neither id nor index is still rejected, null `primary_lane` on NEW_TOPIC is still rejected; projection: empty lanes still rejected; semantic relevance: empty lanes on relevant still rejected, null `exclusion_reason` on irrelevant still rejected). The repair cannot manufacture a satisfiable payload.

### Verification

| Suite | Tests | Result |
|---|---|---|
| `ai-gateway.test.ts` | 17 | pass |
| `topic-matching-evaluator.test.ts` | 46 | pass |
| `topic-projection-evaluator.test.ts` | 49 | pass |
| `semantic-relevance-evaluator.test.ts` | 93 | pass |
| `worker-topic-projection.test.ts` + `worker-topic-assignment.test.ts` + `worker-semantic-relevance.test.ts` | 88 | pass |
| **Total** | **293** | **all pass** |

Instrument: `pnpm --filter @mahalla-ovozi/backend exec tsc --noEmit` → exit **0**. All suites ran against `mahalla_ovozi_test` on port **5433**. No full-repo suite was run.

**Acceptance criteria, checked against source after the change:** (1) `Select-String` over `ai-gateway.ts` for `is_relevant`, `exclusion_reason`, `relevant_lanes`, `is_hokim_related`, `matched_topic_id`, `primary_lane`, `parsedJson.decision`, `parsedJson.lanes`, `parsedJson.reasoning` → **zero matches**; the `Normalize model quirks` comment is gone. (2) The relocated behaviour is covered by evaluator-owned tests (above). (3) Restated as reachable-from-tests, satisfied by the matching over-coercion guards.

### Residual uncertainty

- **The CLI call site was not executed.** `cli/verify-deepinfra.ts:68` routes through `generateStructured` with `SemanticRelevanceResultSchema`. It inherits the relocation by construction, but it needs a live DeepInfra key and outbound network. **Unverified in this environment.**
- **The projection schema's refine is now a tautology.** After the `is_hokim_related` derivation moved into its preprocess, `topic-projection-evaluator.ts:140-147` can no longer fail whenever `lanes` is an array — the preprocess sets exactly what the refine checks. It is retained because it still fires in the one path the preprocess declines to touch (`lanes` not an array), and removing it would be a behaviour-adjacent change beyond this finding's scope. **This is a real residual defect: the refine is now dead weight, and the field is effectively derived rather than validated.** The honest fix is to drop `is_hokim_related` from the model-facing schema and derive it in the evaluator — a follow-up, not part of this relocation.
- **Redundancy left in place deliberately:** `lanes` is deduplicated twice (preprocess at `topic-projection-evaluator.ts:65` and `.transform` at `:82`). The gateway's copy was removed; the in-schema duplication predates this change and was not introduced by it.
- **The normalizer had no test coverage before this change**, so there is no prior-art baseline proving the *old* behaviour was correct — only that it was reachable. The new tests pin the relocated behaviour for the first time.
- **Ordering equivalence** between the old gateway sequence and the new in-schema sequence was reasoned, not exhaustively proven: the matching preprocess runs the `reasoning` slice and the `matched_topic_index` / `matched_topic_id` sentinel coercions *before* the `decision` branches, whereas the gateway ran the `decision` branches before the sentinel coercion. Both orders land on `null` for the two decisions that null `matched_topic_id`, because `matched_topic_id` is already `null` by the time the decision branch runs. No test distinguishes the orders; none was written, because none can observe the difference.

## Note on the review program's own error rate

This fix program caught a **fifth** error in the review artifacts, and the second caused by trusting a grep over reading the writer. The review produced 56 findings; the ones acted on here were sound in their *fix direction* even where the severity or blast radius was overstated. That is worth recording: the review's value came from pointing at the right seams, and its precision was lower than its structure suggested. Findings are analysis, not proof.

## Phase 6 — `L3-P05-09` + `L3-P05-15`, two undeclared string protocols in one coordinator

Executed in a third session. Both findings are `leaky-seam` · `error-handling` and sit on the same seam (backlog Seam D: "job error contracts"). Bundled because they share a file and a class; kept independent in the fixing because, as `L3-P05-09` itself records, fixing one does not fix the other.

### `L3-P05-09` — and the finding is **stronger** than recorded, again

The review records **one** throw site: `topic-assignment-coordinator.ts:327-331`. There are **two**:

- `topic-assignment-coordinator.ts:367-369` — CAS revision/fingerprint mismatch, inside the transaction.
- `topic-assignment-coordinator.ts:539-543` — the zero-row generation-predicate throw.

**The second site did not exist when the finding was written. The previous session's own `L3-P05-10` fix created it** — that remedy added a generation predicate whose zero-row result throws the same prose signal. So one fix introduced a second instance of a defect another finding had just described, and the review's blast radius for `L3-P05-09` is understated by one site. This is the second time in this program a finding proved stronger than recorded (the first was `L3-P05-02`'s second dead refine).

Two further description deltas:

1. **The recorded mechanism is stale.** The review says the coordinator "catches the typed `StaleSnapshotRevisionError`, discards it, and throws a fresh `Error`". `L3-P05-10` replaced that block; site 1 is now a plain inline `throw new Error(...)` with no `catch` and no `casErr` binding. The type was not discarded by a catch — it was simply never used.
2. **The re-export was dead.** `StaleSnapshotRevisionError` was imported at `:31` and re-exported at `:38` with **zero consumers**, because `L3-P05-10` removed its only caller (`assertSnapshotRevision`). Removed.

**Contract decision, put to the user before any edit** (following the `L3-P05-02` precedent, where the contract question was decisive). The two sites carry different facts — site 1 is a *snapshot-revision* staleness, site 2 a *Topic-generation* staleness that `StaleSnapshotRevisionError(currentRevision, expectedRevision)` structurally cannot express. User selected, verbatim: **"A. One coordinator-owned error class with a discriminated reason field"** — over B (two sibling classes, semantically purer but forcing the caller to narrow two types) and C (fix only site 1, knowingly leaving one instance).

**Fix.**
- Exported `StaleSnapshotError` with `code = 'STALE_SNAPSHOT'`, `status = 409`, and `reason: 'SNAPSHOT_REVISION' | 'GENERATION_ADVANCED'`. Site 1 attaches the typed `StaleSnapshotRevisionError` as `cause` via `ErrorOptions`, so the revision numbers survive; site 2 carries its own reason.
- Both `STALE_SNAPSHOT:` message strings are **preserved verbatim** — the prefix remains as operator-facing pg-boss output, it is simply no longer the detection mechanism. This is what let the two existing message-text assertions stay untouched.
- `jobs/topic-assignment-job-handler.ts:116-135` — `catch (err: unknown)` + `err instanceof StaleSnapshotError`; the `err: any` is gone. The stale log event gained a `staleReason` field.

**Acceptance criteria, checked individually.**
- (1) A grep for `startsWith('STALE_SNAPSHOT')` in `apps/backend/src` returns **no matches** — verified by grep after the change. *(AC1 targets the detection, not the message. The prefix survives inside the message string, so AC1 is met on its own terms while the operator-facing literal remains.)*
- (2) A caller can distinguish the path without reading the coordinator's source — proven by the producer test asserting `instanceof StaleSnapshotError`, `.code`, and `.reason` off the rejected promise.
- (3) The thrown value still propagates so pg-boss retries — unchanged; `throw err` remains and Matrix #21 still asserts the literal reaches job output.

### `L3-P05-15` — confirmed, and the fix is mostly deletion

Confirmed at `topic-assignment-coordinator.ts:723-739`: `catch (err: any)`, `err?.code === '23505'` plus a `String(err?.detail).includes('already exists')` prose arm. Two things the finding did not record:

- **The declared helpers already existed and were unused here.** `adapters/db/client.ts:107 extractPostgresError` / `:132 isPostgresError` / `:147 mapPostgresConstraintError`. Notably `extractPostgresError` unwraps Drizzle's `Error.cause` nesting — the coordinator's raw `err?.code` read did **not**, so the old code was fragile to error wrapping as well as to locale.
- **The prose arm was the only real risk, and it is gone.** The rewrite keys on `isPostgresError(err, '23505')` plus the **constraint name only** (`accepted_evidence_district_chat_msg_idx`, confirmed present at `schema/accepted-evidence.ts:37`). The localized `'already exists'` arm was deleted.

### Red → green, and one honest correction about the red

Two tests were added to `apps/backend/tests/worker-topic-assignment.test.ts`.

**The decisive arm:** a decoy `Error` whose message merely *begins* with `STALE_SNAPSHOT:`, thrown from a stub evaluator, asserting the handler routes it to the **error** branch (`TELEGRAM_TOPIC_ASSIGNMENT_ERROR`) rather than the stale branch.

**The first red run was contaminated by a bug in my own test, and this is recorded rather than quietly fixed.** The initial version read `warnSpy.mock.calls` *after* `mockRestore()` — and in Vitest `mockRestore()` also clears `mock.calls`, so both captured arrays were empty and the test failed on the *second* assertion (`erroredEvents`, expected true, got false) rather than the first. That failure was real but was **not** proof of the recorded root cause. Repaired by capturing calls before restoring; the test then went green, and was then **falsified properly**: temporarily restoring the old `startsWith('STALE_SNAPSHOT')` condition made it fail on the **first** assertion (`warnedEvents` contained the stale event, expected false) — exactly the misrouting the finding describes. The probe was reverted and the suite re-run green. A green test that cannot be made to fail proves nothing.

### Verification

| Suite | Tests | Result |
|---|---|---|
| `worker-topic-assignment.test.ts` | **33** (was 30; +3) | pass |

`pnpm --filter @mahalla-ovozi/backend exec tsc --noEmit` → exit **0**. Against `mahalla_ovozi_test` on port **5433**. No full-repo suite was run, and no other test file was touched — verified by grep that `assignEvidenceToTopic`'s only production consumer is `topic-assignment-job-handler.ts:29`.

### Closing the two gaps this fix left open

Both were closed in the same session, each falsified before being trusted.

**`Matrix #26` was indeed not covering the 23505 catch — now proven, not suspected.** `worker-topic-assignment.test.ts:1868` replays the **same** `telegramMessageId`, so the idempotency check short-circuits as `SKIPPED_DUPLICATE` and no insert is ever attempted. The new companion test forces a **genuine** unique violation on `accepted_evidence_district_chat_msg_idx`: the colliding row is inserted from inside `injectedEvidenceResolver` on its **second** call — which lands *after* the idempotency check and *before* the `accepted_evidence` insert — while returning an unchanged snapshot so the CAS check still passes. This makes the collision deterministic rather than scheduler-raced. It asserts `IGNORED_DUPLICATE_VIOLATION`, a status distinct from `SKIPPED_DUPLICATE`, so passing proves control actually reached the catch. This also confirms PostgreSQL populates `constraint` on the driver error, and that `extractPostgresError` surfaces it — the assumption the `L3-P05-15` rewrite depends on.

**`GENERATION_ADVANCED` is now pinned and falsified.** The `L3-P05-10` race test gained three assertions: `toBeInstanceOf(StaleSnapshotError)`, `reason === 'GENERATION_ADVANCED'`, and `cause === undefined`. Because both concurrent assignments read an identical injected snapshot, the CAS check passes for both and the generation predicate is the only mechanism that can reject — so the reason is a **deterministic** assertion, not a timing-dependent one. Falsified by temporarily relabelling site 2's reason as `SNAPSHOT_REVISION`: the test failed with `Expected: "GENERATION_ADVANCED" / Received: "SNAPSHOT_REVISION"` at the `reason` assertion. Probe reverted; suite green at 33/33.

### Residual uncertainty

- **The `status = 409` field is unused.** `StaleSnapshotRevisionError` carried it and the new class mirrors it, but nothing in the retry path reads it — pg-boss retries on any throw. Retained for parity, not because it is load-bearing.
- **`StaleSnapshotRevisionError` now has no production consumer at all** — only the new test imports it. It remains exported from `context-snapshot.ts` and is still the type attached as `cause`. Whether it should be deleted outright is a separate question this fix does not answer.
- **The 23505 catch's remaining exposure is unchanged in kind:** the constraint-name match is now the only arm, so if the index is ever renamed the detection breaks silently. That is the intended trade — a rename is a code change visible in review, whereas the deleted prose arm could break from a driver locale change with no code change at all.

## Phase 7 — `is_hokim_related` is now derived, not validated (the L3-P05-02 follow-up)

Unranked finding, no ID, recorded in `fix-backlog.md` Tier 4 and in Phase 5's residual uncertainty. Authorised by the user in the same session as Phase 6.

### The defect

Moving the `is_hokim_related` derivation into `TopicProjectionResultSchema`'s `z.preprocess` during `L3-P05-02` left the schema's `.refine` a **tautology**: the preprocess set `copy.is_hokim_related = copy.lanes.includes('HOKIM_RELATED')`, and the refine then asserted exactly that equality. It could not fail whenever `lanes` was an array. It was retained only because it still fired on the one path the preprocess declined to touch (`lanes` not an array).

### The fix, and why it is a contract correction rather than a test fix

`is_hokim_related` is a **pure function of `lanes`**. Asking the model to echo it created a field that could only ever disagree, never inform — and then immediately coerced any disagreement away. So the field was removed from the model-facing contract entirely:

- `topic-projection-evaluator.ts:134-138` — the `is_hokim_related: z.boolean()` field is gone from the object schema.
- `:140-143` — the `.refine` is gone, replaced by `.transform((data) => ({ ...data, is_hokim_related: data.lanes.includes('HOKIM_RELATED') }))`. The field is **derived** on the way out, so the parsed type and every downstream consumer are unchanged.
- `:249` — the prompt line *"`is_hokim_related` MUST be true if and only if HOKIM_RELATED is present in `lanes`"* was deleted, so the model is no longer asked for it.
- The preprocess no longer touches the field.

`apps/backend/src/modules/topics/topic-projection-job-handler.ts` is unchanged: it reads `evaluation.isHokimRelated` at five sites, and the type still carries it.

**Why a `.transform` and not derivation at the consumption site.** The first attempt made `TopicProjectionResult` an interface intersecting the schema's output with `{ isHokimRelated: boolean }`, which broke roughly forty test fixtures across five files that construct `TopicProjectionResult` values. Using a `.transform` keeps `TopicProjectionResult = z.infer<...>` truthful — the derived field is genuinely part of the schema's output type — so **no test fixture needed changing**. That is the smaller delta and the more honest type.

### Not verified by the gateway

The gateway does **not** build a JSON schema from the Zod schema — `ai-gateway.ts:236` calls `options.schema.safeParse(parsedJson)` and nothing else, confirmed by grep for `zodToJsonSchema` / `jsonSchema` (no matches). So removing the field from the prompt plus the schema is the complete change; there is no provider-side schema document that also needed regenerating. **This was checked, not assumed.**

### Tests, falsified

Three tests added to `apps/backend/tests/topic-projection-evaluator.test.ts`:

1. A payload **omitting** the field with `HOKIM_RELATED` present parses, and derives `true`.
2. A payload **omitting** the field without `HOKIM_RELATED` parses, and derives `false`.
3. A payload **supplying** `is_hokim_related: true` with `lanes: ['WATER']` derives `false` — the model's echo is ignored, not validated, and cannot cause a rejection.

Falsified by temporarily restoring `is_hokim_related: z.boolean()` to the object schema: tests 1 and 2 failed with `"message": "Required"` — precisely the old contract, where an omitted field was a validation error. Probe reverted.

### Verification

| Suite | Tests | Result |
|---|---|---|
| `topic-projection-evaluator.test.ts` | **52** (was 49; +3) | pass |
| `unit/topic-matching-resilience.test.ts` | 19 | pass |
| `topic-projection-reconciliation.test.ts` | 7 | pass |
| `worker-topic-projection.test.ts` | 28 | pass |
| `ai-gateway.test.ts` | 17 | pass |
| `worker-topic-assignment.test.ts` | 33 | pass |

149 passed / 7 skipped across the six-file run. `tsc --noEmit` → exit **0**.

### Incident: a killed test run left database residue

A first attempt to run those six files together **timed out at 120 s and was force-killed mid-flight**, leaving one `districts` row (`dist_rec_46f7ec96`, name `'Reconciliation Test District'`, created `15:51:31Z`) plus its dependent rows behind, because `topic-projection-reconciliation.test.ts` creates that district in `beforeAll` and deletes it in `afterAll` — which a kill never reaches. The next run then failed with a genuine PostgreSQL `23505` on `districts_name_lower_idx`.

This was **my process's residue, not a product defect**. Diagnosed by reading the orphan's `created_at` against the killed run's timing, then removed in FK order mirroring the test's own `cleanupTestData`, scoped strictly to the one proven orphan id. The suite returned to 7/7 immediately, confirming it as the sole cause. Recorded because a future reader hitting that constraint failure should know it can be residue rather than a real conflict. **Lesson: a force-killed integration run against a shared test DB can leave state that makes the next run fail for an unrelated reason.**

## Phase 8 — `L3-P03-01`, the query engine's interface was ~3× wider than its use

**Scope confirmed with the user before any edit** (four decisions, all answered in favour of the recommended option): the `:113-115` alias triple is deleted; the duplicate `TopicNotFoundError` is folded in; the lane constants are consolidated into `api-contracts` and all web copies fixed; `queryTopics` is **un-exported only**, with the missing own-module test recorded as residual rather than expanded into scope.

### Re-derivation — the finding held, with one correction and one omission

The finding was re-derived name-by-name from source rather than trusting the recorded table. 26 export lines / 28 names / 18 zero-consumer names all **confirmed**. Two corrections:

1. **`InvalidCursorError` (`:59`) has 2 production consumers, not 1** — `district-topics-routes.ts:16` and `hokim-topics-routes.ts:22`. The artifact recorded only one. This does not move the total (the name was never in the zero-consumer set) but it makes the module more load-bearing than recorded. A first-pass miscount of 19 zero-consumer names was traced to `InvalidDateRangeError`, which is genuinely consumed — *through the re-export*, the very defect at `:29`.
2. **The web app has five lane-constant copies, not four.** The handoff and the artifact both miss `apps/web/src/hooks/useLaneOrderPreference.ts:4` (`CANONICAL_LANE_ORDER`), consumed by `FiveLaneBoard.tsx:28`. Corrected in this fix.

### The trap that was not in the record: lane order is load-bearing and differs from the enum

All six lane arrays are ordered `HOKIM_RELATED, WATER, ELECTRICITY, GAS, WASTE`. `QualifyingLaneSchema` (`packages/api-contracts/src/topics.ts:4-10`) is ordered `WATER, ELECTRICITY, GAS, WASTE, HOKIM_RELATED`. **Deriving the shared constant from `QualifyingLaneSchema.options` — the obvious implementation — would have silently reordered the Hokim dashboard.** The order is user-visible: `useLaneOrderPreference.test.ts:22,28` asserts it and `FiveLaneBoard` renders in it. The constant is therefore an explicit literal with a comment forbidding derivation, and a test asserts the order independently of the permutation check.

### Red → green, per phase

| Phase | Files | Red evidence | Green evidence |
|---|---|---|---|
| 1 — contracts owns the lane list | 2 | `lanes-contracts.test.ts` failed: `CANONICAL_LANES` resolved to `undefined` (not yet exported) | 3/3 pass; full contracts suite **75/75** |
| 2a — `LaneMultiSelect` + 2 consumers | 3 | three `TS4104`/`TS2345` `readonly` errors at the mutable boundaries | `tsc --noEmit` → exit 0 |
| 2b — 4 remaining web copies | 4 | — (same class of error, pre-empted by spreading at the boundary) | `tsc --noEmit` → exit 0; `useLaneOrderPreference.test.ts` **7/7** |
| 3 — narrow the engine | 3 | — (deletion; no new behaviour) | `tsc --noEmit` → exit 0 |
| 4 — integration | — | — | `hokim-topic-search.test.ts` **15/15** |

**Falsification (Phase 1).** Temporarily reordering the literal to `WATER, HOKIM_RELATED, …` failed the order assertion (`expected [ 'WATER', 'HOKIM_RELATED', …(3) ] to deeply equal [ 'HOKIM_RELATED', 'WATER', …(3) ]`) **while the permutation and not-derived tests still passed** — proving the order test is genuinely load-bearing and not a restatement of the permutation test. Probe reverted.

### What changed

- `packages/api-contracts/src/topics.ts` — added `CANONICAL_LANES` as an explicit `readonly QualifyingLane[]` literal in HOKIM_RELATED-first order, with a comment explaining why it must not be derived.
- `packages/api-contracts/tests/lanes-contracts.test.ts` — **new**, 3 tests: exact order; duplicate-free permutation of the schema options; and an explicit assertion that it is *not* the enum order.
- `apps/web` — all five copies deleted; `LaneMultiSelect.tsx`, `DistrictTopicFilterBar.tsx`, `FilterModalSheet.tsx`, `useDashboardFilterParams.ts`, `useHokimTopicBoard.ts`, `useTopicStatistics.ts` now import from the contract. `useLaneOrderPreference.ts` keeps the name `CANONICAL_LANE_ORDER` as a documented alias so `FiveLaneBoard.tsx` and its test are untouched.
- `topic-query-engine.ts` — **6 export lines deleted** (`:29` re-export, local `CANONICAL_LANES`, duplicate `TopicNotFoundError`, the three-name alias triple); **11 `export` keywords dropped** while keeping the declarations (`TopicKeysetCursorPayload`, `encodeTopicKeysetCursor`, `RawTopicRow`, `TopicQueryFilters`, `TopicQueryResult`, `HokimTopicBoardFilterParams`, `HokimLaneQueryParams`, `ActorContext`, `queryTopics`, `checkProcessingDelay`, `resolvePriorPeriodComparison`).
- `district-topics-routes.ts` — `InvalidDateRangeError` now imported from its declaring module, `../telegram-intake/timezone-util.js`.
- `hokim-topic-search.test.ts` — `escapeLikePattern` now imported from its declaring module, `./topic-query-helpers.js`.

Net: **59 insertions, 206 deletions** across 12 source/test files.

### Acceptance criteria, measured not asserted

| Criterion | Result |
|---|---|
| (1) ≤10 export lines in `topic-query-engine.ts`, each consumed outside the file | **9** — `DistrictNotFoundError`, `DistrictRequiredError`, `InvalidCursorError`, `decodeTopicKeysetCursor`, `queryDistrictMahallas`, `queryDistrictTopicsPage`, `queryHokimBoard`, `queryHokimLaneBatch`, `queryHokimStatistics` |
| (2) no export line is a re-export of another module's symbol | **0** `export {` lines |
| (3) `tsc --noEmit` exits 0 | exit **0** for `api-contracts`, `web`, and `backend` |

**AC(2) was previously unsatisfiable as written**, because `:29`'s re-export and the local `CANONICAL_LANES` could not both be removed while `district-topics-routes.ts:17` still imported `InvalidDateRangeError` from the engine. Resolved by repointing that import at the declaring module — which is what the finding's own fix direction asked for but its acceptance criterion did not require.

### Verification

| Suite | Tests | Result |
|---|---|---|
| `packages/api-contracts` (full) | **75** (was 72; +3) | pass |
| `apps/web/src/hooks/useLaneOrderPreference.test.ts` | 7 | pass |
| `apps/backend/tests/hokim-topic-search.test.ts` | 15 | pass |
| `tsc --noEmit` — api-contracts / web / backend | — | exit 0 / 0 / 0 |

All test runs against **`mahalla_ovozi_test` on port 5433** (connectivity confirmed before the run, not assumed). Single affected file run, not a global suite.

**One check beyond the plan.** `tsc --noEmit` cannot catch a *declaration-emit* failure: with `declaration: true` in `tsconfig.base.json`, an exported function whose parameter type is a now-un-exported interface would fail only at emit (TS4053). Ran `tsc --emitDeclarationOnly --declaration` against the backend — **exit 0**, temp dir removed. Without this the narrowing of `TopicQueryFilters`/`TopicQueryResult`/`HokimLaneQueryParams` could have broken `pnpm build` while `--noEmit` stayed green.

### Scope decisions taken, and what they leave open

- **`ActorContext` (`:181`) is un-exported but not deleted.** Deleting it is `L1-P01-01` (contracts' `districtId` is nullable/optional; the engine's is required), which carries type risk across the contracts seam and was deliberately not folded in.
- **`L3-P03-02` (the alias triple) is fully closed.** The three names had zero references workspace-wide, including tests. No `git` history justification was found for the "Backward compatibility" comment — the module has no prior public version.
- **`L3-P03-03` (duplicate `TopicNotFoundError`) is partially closed.** The engine's dead copy is deleted, so the duplicate no longer exists *in this module*; the identically-named class in `topic-evidence-service.ts:75` is untouched and remains the single live one. The finding is closed as a duplication, not as a class-hierarchy question.

### Residual uncertainty — honest list

1. **`queryTopics` is still the module's real seam and still has no direct test.** Un-exporting it satisfies the finding's letter, but `topic-query-engine.ts` remains testable only through its three route-level entry points; its own test file (`hokim-topic-search.test.ts`) exercises it only indirectly via HTTP, and imports `escapeLikePattern` — a helper declared in another module. **This is the largest thing this fix does not address** and is proposed as a follow-up finding rather than silently accepted.
2. **The web lane refactor was type- and test-verified but never visually inspected.** I did not drive a browser. The behaviour should be identical (all six arrays were content-identical and order-identical before the change), and the order test covers the ordering risk, but no screenshot or E2E sign-off exists.
3. **No falsification test exists for the web-side changes.** The `readonly`→spread conversions at three mutable boundaries were driven by compiler errors, not by a red test. The contracts-level order test is falsified; the web consumers are covered only by `tsc` and the pre-existing 7-test file.
4. **`CANONICAL_LANES` is now a cross-layer contract export.** It is a value, not just a type, in a browser-safe package. That is consistent with `CONTEXT.md`'s contracts invariant ("browser-safe Zod request/response schemas") but it does widen what `api-contracts` owns. Not a defect; a boundary the next reviewer should know moved.





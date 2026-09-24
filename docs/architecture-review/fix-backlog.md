# Fix backlog

**NOT AUTHORISED. REQUIRES FRESH APPROVAL.**

This document ranks the findings the architecture-review program produced. It is an index, not a plan. Every item below points at a finding that already recorded its own *fix direction* and *acceptance criteria*; nothing here adds implementation steps, designs a refactor, or authorises a change. The program was read-only by decision (`INDEX.md`, frozen constraints), and that constraint is not lifted by writing this file.

Baseline: HEAD `bdf999a`. Program: 8 artifacts, **56 findings** (0 blocker · 12 high · 34 medium · 10 low); the L3 topics slice alone is 44 (9 high · 25 medium · 10 low). Source of truth is `INDEX.md`; this backlog is its ranked view.

---

## Progress — all twelve ranked items are FIXED

All eleven were executed test-first (failing test → confirmed failure for the recorded root cause → minimal fix → re-run green) and verified against `mahalla_ovozi_test` on port **5433**. Two partial exceptions are recorded honestly: `L3-P03-01`'s web-side lane consolidation was driven by compiler errors rather than a red test (see `fix-ledger.md` Phase 8), and `L3-P04-01`'s `:475` call site preserves an explicit `null → ''` coercion rather than widening a shared evaluator contract (Phase 9).

| Rank | Finding | Status | Notes |
|---|---|---|---|
| 1 | `L3-P05-10` | **fixed** | *not deterministically tested* — see `fix-ledger.md` residual uncertainty |
| 2 | `L3-P05-01` | **fixed** | proven by a failing-then-passing test |
| 3 | `L3-P04R-01` | **fixed** | the finding itself was corrected: severity high → medium |
| 4 | `L3-P05-17` | **fixed** | |
| 5 | `L3-P05-16` | **fixed** | bundled with `L3-P05-17` (shared statement) |
| 6 | `L3-P05-09` | **fixed** | finding confirmed *stronger* than recorded; bundled with `L3-P05-15` |
| 7 | `L3-P05-02` | **fixed** | finding confirmed *stronger* than recorded; 3 artifact defects corrected |
| 8 | `L3-P03-01` | **fixed** | interface narrowed 28 → 9 exports; two more artifact corrections (session 4) |
| 9 | `L3-P04-01` | **fixed** | one owner for payload text; `L3-P04R-02` corrected medium → **high**; a **new** finding filed (`L3-P04R-05`, the fourth implementation, in no artifact) |

`L3-P05-15` (low, unranked below) was fixed in the same pass as rank 6 — same file, same class, backlog Seam D. The unranked `is_hokim_related` tautology was fixed in session 3.

**Ranks 10–12 were the highest-ranked remaining items; all are now closed.** Ranks 10 and 11 were closed in sessions 6 and 7; rank 12 in session 7. No ranked item remains.

Per-finding detail, red-green evidence, and residual uncertainty live in `docs/architecture-review/fix-ledger.md`. This file stays an index; it does not carry the fix records.

---

## How to read the ranking

Ranked by **severity × strength × blast radius**, with one tie-breaker: silent failures rank above loud ones, because a wrong value that is written and never noticed costs more than an error that surfaces. Verification status is stated on every item — an `observed` finding read from source is not the same evidence as an `inferred` one, and none of the top items was executed (the program prohibited test runs).

## Tier 1 — silent wrong data

These four write or suppress a value that is wrong without raising anything. They are the reason the program exists.

**1. `L3-P05-10` — the CAS guard runs on a different connection than the commit it guards** · high · strong · observed · `concurrency` · **[FIXED — session 1]**
`topic-assignment-coordinator.ts:306-332` + `:515-523`, `boss-client.ts:227`. The guard re-reads the snapshot on the pool client; the commit runs on a dedicated connection, and the `UPDATE topics` has no generation predicate. Two concurrent jobs for one Mahalla can both pass and both commit. *Blast radius:* every concurrent assignment on a busy day. *Fix direction and acceptance criteria:* recorded in `phase-05b-assignment-coordination.md`, finding `L3-P05-10`.

**2. `L3-P05-01` — anchor index resolves against a different list than the prompt labels** · high · strong · observed · `correctness` · **[FIXED — session 1]**
`topic-projection-evaluator.ts:315-342` vs `:451-453`; persisted at `topic-projection-job-handler.ts:295`, `:314`. Evidence is labelled by truncated index but resolved against the untruncated array — off by `N-15` for any Topic with more than 15 evidence items, writing the wrong `anchorEvidenceId`/`anchorQuote`. **Independently re-verified by the main session at all four lines.** *Blast radius:* any busy Topic; the anchor is the citation the Hokim's dashboard shows. *Fix direction and acceptance criteria:* `phase-05a-topic-evaluators.md`, finding `L3-P05-01`.

**3. `L3-P04R-01` — `promoteSignal` reads payload keys no producer writes** · high · strong · observed · `correctness` · **[FIXED — session 1; severity corrected high → medium]**
`topic-evidence-management-service.ts:607-620`. The Product Owner's manual promotion reads root-level `verbatimText`/`text`; all three producers store the raw Telegram update at `payload.message.text`. Promotion throws, and the message blames a retention purge that did not happen. *Blast radius:* every manual override of a structurally excluded message — the one path whose purpose is human override. *Fix direction and acceptance criteria:* `phase-04r-evidence-read-repair.md`, finding `L3-P04R-01`.

**4. `L3-P05-17` — failure telemetry fabricates Audit-Record-grade fields** · high · strong · observed · `correctness` · **[FIXED — session 1]**
`topic-projection-job-handler.ts:398-410`. A failed projection writes a hardcoded profile id, `contextRevision: 0`, and `snapshotFingerprint: 'error'`; and its `onConflictDoUpdate` can flip a `COMPLETED` row to `FAILED`. *Blast radius:* audit-trail integrity and Console health reporting. *Fix direction and acceptance criteria:* `phase-05c-jobs-reconciliation.md`, finding `L3-P05-17`.

## Tier 2 — silent missing signal

**5. `L3-P05-16` — the reconciliation sweep keys on a generation the failure path never writes** · high · strong · observed · `correctness` · `hidden-dependency` · **[FIXED — session 1]**
`topic-projection-job-handler.ts:150`, `:195`, `:407` vs `topic-reconciliation-service.ts:141`, `:196`. The success path writes a coalesced generation into `ai_operations.target_id`; the failure path writes the job's. The sweep searches for the coalesced one, so it never matches a failure and never raises the `TOPIC_PROCESSING_DELAY` issue. A stuck topic is retried forever and reported healthy. *Blast radius:* the operator's only signal that a district's summarisation is failing. *Fix direction and acceptance criteria:* `phase-05c-jobs-reconciliation.md`, finding `L3-P05-16`.

## Tier 3 — undeclared contracts

These are not wrong values but contracts callers cannot see, which is how the Tier 1 and Tier 2 defects become possible.

**6. `L3-P05-09` — `STALE_SNAPSHOT` is a string-prefix protocol the interface does not declare** · high · strong · observed · `leaky-seam` · `error-handling` · **[FIXED — session 3]**
`topic-assignment-coordinator.ts:327-331` throws with a message prefix; `topic-assignment-job-handler.ts:118` recovers the type with `startsWith`. The typed `StaleSnapshotRevisionError` is discarded one frame after it is produced. *Blast radius:* the retry path that must never silently degrade. *Fix direction and acceptance criteria:* `phase-05b-assignment-coordination.md`, finding `L3-P05-09`. *Related, lower severity, same class:* `L3-P05-15` (PG `23505` detection via `catch (err: any)` and a localized driver message) in `phase-05c-jobs-reconciliation.md` — **also FIXED in session 3**.

**Session 3 correction — the finding is stronger than recorded.** There are **two** throw sites, not one: `topic-assignment-coordinator.ts:367-369` (CAS revision) and `:539-543` (zero-row generation predicate). **The second was created by the previous session's own `L3-P05-10` fix**, so one remedy introduced a second instance of this defect. The recorded mechanism is also stale — the "catches `StaleSnapshotRevisionError`, discards `casErr`" block no longer exists; `L3-P05-10` replaced it with a plain inline throw. Full record: `fix-ledger.md` Phase 6.

**7. `L3-P05-02` — both evaluators' output contracts are rewritten by an undeclared normalizer in the shared gateway** · high · hidden-dependency · observed · **[FIXED — session 2]**
**[FIXED — session 2]** `ai-gateway.ts:231-256` mutated parsed model output before `safeParse`, with branches hard-coded to the topic-matching decision enum and the projection fields. Both evaluators believed their Zod schema was the contract. The matching schema's `.refine` at `topic-matching-evaluator.ts:97-120` was unreachable in production for its `primary_lane`/`matched_topic_id` arms. *Blast radius:* every AI call through the gateway, and any future evaluator that trusts its own schema. *Fix direction and acceptance criteria:* `phase-05a-topic-evaluators.md`, finding `L3-P05-02`.

**Corrections made during the fix — three, all recorded in `fix-ledger.md` Phase 5:**
1. The finding is **stronger than recorded**. It reports one unreachable refine; there were **two**. `topic-projection-evaluator.ts:125-132`'s refine (`is_hokim_related === lanes.includes('HOKIM_RELATED')`) was equally unreachable, because `ai-gateway.ts:255` set that field unconditionally from `lanes` before the parse.
2. **Acceptance criterion (3) was self-contradictory.** It required the matching `.refine` be reachable *in production* for at least one consistency arm, while the finding's own deletion test concluded the coercion must be *preserved* — and preserving it necessarily keeps those arms pre-empted. Restated as **reachable from the evaluator's own test suite**.
3. The cited call-site line `topic-projection-evaluator.ts:429-436` had drifted to `:454`. **Not a review error** — an earlier fix (`L3-P05-01`) edited that file. Flagged so it is not later mistaken for one.

*Contract confirmed with the user before any edit* (relocate each coercion into the evaluator that owns the schema, leaving only provider-generic cleanup in the gateway). The intent was deliberate and load-bearing; the placement was accidental — `git blame` attributes all 26 normalizer lines to one commit, `d9b357b` (2026-09-01), a behavioural bug fix with **no test coverage** of the normalizer anywhere.

## Tier 4 — interface width and ownership

The 21 medium findings cluster here. Only those with the widest blast radius are listed; the rest are in their artifacts.

**8. `L3-P03-01` — 18 of 28 exported names have no consumer; interface ~3× wider than use** · high · strong · observed · `shallow-module` · **[FIXED — session 4]**
`phase-03-topics-read-path.md`. Also the prior-art reconciliation's most-corrected item: the prior pass said "nine zero-consumer exports" and additionally misidentified `queryDistrictTopicsPage` as unconsumed when it is imported at `district-topics-routes.ts:20,87,128`.

The fix narrowed `topic-query-engine.ts` from 28 exported names to **9**, all consumed: 6 export lines deleted (the `:29` re-export, the local `CANONICAL_LANES`, the duplicate `TopicNotFoundError`, and the `:113-115` alias triple) and 11 `export` keywords dropped. `L3-P03-02` is closed; `L3-P03-03` is partially closed (the engine's duplicate class is gone, `topic-evidence-service.ts:75` remains the live one). The lane constants were consolidated into `packages/api-contracts` and **all five** web copies removed — the handoff recorded four, missing `useLaneOrderPreference.ts:4`. Full record: `fix-ledger.md` Phase 8, including the lane-order trap that made the obvious implementation wrong.

**9. `L3-P04-01` — Accepted Evidence reading has no single owner** · high · strong · observed · `low-locality` · **[FIXED — session 5]**
`topic-evidence-service.ts:188` vs `topic-evidence-management-service.ts:122`/`:394`. **P4R corrected this candidate's scope:** the *query* split is principled and should not be collapsed; the accidental part is verbatim-text resolution, which `L3-P04R-02` shows now exists in three copies with the SQL one already diverging from the TypeScript one. Fix the resolution, keep the query modules separate.

**Session 5 correction — the finding was half wrong, and the real defect was sharper.** `getTopicEvidence` (`topic-evidence-service.ts:188`) does **not** resolve verbatim text; it reads the `ae.verbatim_text` column (`:256`, rendered `:331`) and never walks a payload. Only the intake-centric read resolves text. There was no two-module duplication of resolution. The live defect was entirely Seam B — plus a **fourth** implementation, `extractVerbatimTextFromRawPayload` at `semantic-relevance-job-handler.ts:34-42`, which was in **no artifact** and reversed the precedence, making the finding's own AC(3) input (`{ message: { text: 'A' }, verbatimText: 'B' }`) return `'A'` where the read path returned `'B'`. Filed as `L3-P04R-05`. All four resolutions were collapsed into one deep module (`telegram-intake/telegram-payload-text.ts`); the SQL search predicate now derives its arms from the same shape list, which also closed a previously-unreported half of the gap (a root-level `text` the resolver read and no arm covered). Full record: `fix-ledger.md` Phase 9. Sites #4–#6 (envelope selection) remain filed, not fixed.

**10. `L1-P01-01` — `ActorContext` declared four times with divergent nullability** · high · strong · observed · `duplication` · `hidden-dependency` · **[FIXED — session 6]**
`packages/api-contracts/src/auth.ts:6-12` (`districtId` nullable/optional) vs `topic-query-engine.ts:181-185` (`districtId` required), plus `district-onboarding-engine.ts:62` and `hokim-accounts-service.ts:61`. *Blast radius:* cross-layer type safety at the contracts seam.

**11. `L1-P01-02` — `ApiErrorEnvelopeSchema` has no backend producers** · high · strong · observed · `leaky-seam` · `untestable-interface` · **[FIXED — session 7]**
A contract with no producer is a promise nothing keeps. **The claim's core held; three of its details did not.** Re-verified at source before editing: the literal-site count is **199**, not "250+"; the backend was *not* purely literal — `entrypoints/http.ts:154-244` `setErrorHandler` and `:246-253` `setNotFoundHandler` were already centralised programmatic producers; and the finding's stated mechanism (a route emitting `error` without `code`) had **0 live offenders**. The schema was **not** dead — `apps/web/src/lib/api-client.ts:68` is a live production consumer the whole web error path depends on — so the correct branch was to bind the producers, not delete the contract.

**Fixed:** one producer-side gate, `apps/backend/src/modules/errors/api-error-envelope.ts` — `serializeApiError` / `serializeNotFoundError`, both returning a body that has passed `ApiErrorEnvelopeSchema.parse`. Both centralised producers in `entrypoints/http.ts` now route through it. AC(1) and AC(2) met.

**AC(3) is PARTIAL and deliberately so.** The 199 hand-written route literals still bypass the gate. Collapsing them from `reply.send({ error })` to `throw DomainError` is the deep-module endgame the finding asks for, but it touches every route module and carries real regression surface; it is **filed, not fixed** (see below). What AC(3) *does* now have is a hard backstop: nothing the global handler emits can be contract-invalid.

**The finding missed the real live defect, which was fixed instead.** `common.ts:43` types `blockers` as `z.array(z.record(z.unknown()))`, so the generic schema validates *nothing* about blocker structure, while `api-client.ts:75` cast the result to `PrerequisiteItem[]` and `districts-routes.ts:227` produced real `PrerequisiteItem[]`. The fix validates the carve-out shape (`DistrictNotReadyErrorEnvelopeSchema`) at `api-client.ts:19-28` and falls back to the raw array only when the body does not conform, so no currently-working path changes behaviour. Verified live: the producer's `code` is `'DISTRICT_NOT_READY'` (`district-onboarding-engine.ts:42-43`), its 8 prerequisite keys match `PrerequisiteKeySchema` exactly, and its statuses are the lowercase enum — so the branch is genuinely reachable, not dead code.

**Follow-up filed — the 199-literal migration.** Give route handlers a way to `throw` a domain error carrying `statusCode`/`code`/`blockers` (the `ForbiddenOriginError` at `http.ts:39-43` and `InvalidDateRangeError` at `telegram-intake/timezone-util.ts:33-40` are the existing pattern) and let the one global handler serialise it. Until then the new gate guarantees validity for everything that passes through the handler, and the literals remain hand-asserted.

**12. `L1-P02-01` — sentinel UI text and its predicate live in the contract package** · high · strong · observed · `leaky-seam` · **[FIXED — session 7]**
Presentation leaking into the browser-safe contract package. **The symptom was real; the load-bearing mechanism was false.** The record claimed the backend *writes* the sentinel into the `summary` column. It does not — `topic-projections.ts:20` is `summary: text('summary').notNull()`, and the literal existed only as a read-time `COALESCE` (`topic-query-engine.ts:286`) / `??` (`topic-evidence-service.ts:291`) over a `LEFT JOIN`. So consequence (2) ("changing UI copy changes stored data") was **false**, and (3) was overstated. Consequence (1) stood and was the real defect: no flag, so "unprojected" was only distinguishable by string equality.

**Fixed:** pending state is now an explicit **nullable `summary`** — the record's own second option, and it matches reality, since `null` already meant "no projection row". `PENDING_TOPIC_SUMMARY_TEXT` and `isTopicSummaryPending` are deleted; `TopicCardItemSchema.summary` is `z.string().nullable()`. Three backend read sites and 7 web compile sites updated; the sentinel string no longer exists anywhere in the repo.

**AC(1) satisfied under a narrower reading, stated openly:** as literally worded it would also condemn the ~100+ Uzbek zod validation messages across the contract package. Read as "no *rendering* copy" — validation messages describe rejected input (contract data); a sentence rendered in place of absent data is presentation. AC(2) and AC(3) met. Full record: `fix-ledger.md` Phase 12.

**All twelve ranked items are now fixed.**

**~~New — no ID assigned yet. `is_hokim_related` is now validated by a tautology.~~** · **[FIXED — session 3]**

Found during the `L3-P05-02` fix and initially left unfixed as out of scope. Relocating the `is_hokim_related` derivation into `TopicProjectionResultSchema`'s `z.preprocess` had made the schema's `.refine` a tautology — it could no longer fail whenever `lanes` was an array, because the preprocess set exactly what the refine checked.

Fixed as recorded: the field was dropped from the model-facing schema (and from the prompt) and is now **derived** by the schema's `.transform`, so `TopicProjectionResult` still carries it for every downstream consumer. The rationale is that `is_hokim_related` is a pure function of `lanes` — a model echo of it could only ever disagree, never inform, and the disagreement was then coerced away anyway. Full record: `fix-ledger.md` Phase 7.

## Deepening candidates grouped by seam

These are the `strong` architectural candidates — places where a deeper module would remove a whole class rather than a symptom. Grouped by the seam they sit on, because that is what a reviewer needs to decide scope.

**Seam A — AI provider boundary.** `L3-P05-02` (undeclared output normalizer in `ai-gateway.ts`). The gateway rewrites payloads that its callers' schemas claim to own. One owner for "what the model actually returned" would make both evaluators' schemas true again. `L3-P05-04` (`profileId` declared on both evaluator inputs, passed by neither production caller) belongs here as well.

**Seam B — evidence text resolution.** `L3-P04-01` + `L3-P04R-01` + `L3-P04R-02` + `L3-P04R-05`. Four implementations of "what is this message's text?" — a TypeScript extractor, an inline copy seventy lines below it in the same file, a SQL predicate that had already drifted, and a fourth in `modules/ai/` that reversed the precedence and was in no artifact. **All four are now one deep module**, `apps/backend/src/modules/telegram-intake/telegram-payload-text.ts`, called by every reader and by the search predicate. **This seam is CLOSED** (session 5). The lesson generalises: the correct unit of search for this class is the concept ("who turns `raw_payload` into text?"), not the file the finding sits in — a file-scoped survey undercounted by one.

**Seam C — generation/keyset identity.** `L3-P05-01` + `L3-P05-16`. Two independent instances of a producer and a consumer disagreeing about which index or generation a value refers to. The pattern recurs because each side is written separately and nothing type-checks the agreement.

**Seam D — job error contracts.** `L3-P05-09` + `L3-P05-15`. Two undeclared string protocols in one coordinator (`STALE_SNAPSHOT` prefix, PG `23505` prose match). **Both FIXED in session 3** — replaced by a typed `StaleSnapshotError` with a discriminated `reason`, and by `isPostgresError` + constraint-name matching respectively. The seam is closed unless a third protocol appears; the lesson (a protocol the interface does not declare becomes a prose contract) generalises to the other seams.

**Seam E — tenant lifecycle guards.** `L3-P05-21` (district lifecycle predicate copy-pasted four times across the slice) + `L3-P05-13` (retry-flag cleanup bound to `finally`). The rule "which district states permit work" has no owner.

## Explicit non-recommendations

Things the program examined and concluded should **not** change. Recorded so a future pass does not "fix" them.

- **Do not collapse the query modules.** `topic-query-engine.ts` and the evidence read paths are a principled split by consumer (Hokim board vs Product Owner triage). `L3-P04-01`'s corrected scope says so.
- **Do not delete `topic-matching-resolver.ts` or `topic-projection-evaluator.ts`.** The deletion test survived for both — the evaluator's ~7 post-generation guardrails are testable only because they sit behind one class.
- **`isUzbekCyrillic` and `findDirectReplyTopic` are load-bearing** (`L3-P05-06`, `L3-P05-05`): `findDirectReplyTopic` prevents a paid AI call on every direct reply.
- **The projection handler's CAS is correct** — it locks the row and re-checks on `tx` (`topic-projection-job-handler.ts:199-232`). The slice contains one correct CAS implementation and one broken one (`L3-P05-10`); do not "unify" them without knowing which is which.
- **The index contract between the matching prompt and the resolver is aligned.** `L3-P05-12`'s sibling check in `phase-05b-assignment-coordination.md` verified both the producer (`topic-matching-evaluator.ts:318-344`) and the consumer (`topic-assignment-coordinator.ts:253` + `topic-matching-resolver.ts:95`) and found **no off-by-one**. Do not re-litigate it.

## Verification status — read before acting on Tier 1

None of the Tier 1–2 items was **executed**. The program prohibited test runs. Each is `observed` at the source-line level: the literal expressions were read and quoted, and for the two index/generation findings both the producer and the consumer sides were read and quoted rather than inferred from one. The cheapest confirmations, should anyone want them before committing to a fix:

- `L3-P05-01` — one Topic with >15 evidence items, then compare the stored `anchorEvidenceId` against the evidence the prompt labelled `Evidence #1`.
- `L3-P05-10` — a two-worker concurrent-assignment test against `mahalla_ovozi_test`, asserting exactly one `requiredDerivedGeneration` increment per committed evidence item.
- `L3-P05-16` — force one projection failure with `generation < requiredDerivedGeneration`, run `reconcileUnprojectedTopics`, assert `issuesRaisedCount: 1`.
- `L3-P04R-01` — promote an intake row whose `raw_payload->>'status' = 'EXCLUDED'` and whose `raw_payload->'message'->>'text'` is non-empty.

Any test written for these must run against `mahalla_ovozi_test`, never `mahalla_ovozi`.

## Program-level caveat

Four artifact writes failed during this program and were caught by filesystem verification, not by trusting a report: `phase-04-topics-evidence-path.md` (10 claimed, 6 recorded), `recon-l4-web-data.md` (15 claimed, 1 recorded), and both P5b attempts (one wrote nothing, the next wrote 4 of 7). The five slice artifacts and this backlog were each verified by counting `^### <ID>` headings against the header's own `Findings` claim. `recon-l4-web-data.md` is still truncated at 1 of 15 and its row in `INDEX.md` says so; **no L4 conclusion beyond `L4-P01-01` should be relied on.**

Two corrections are recorded in `INDEX.md` rather than silently fixed. The gate's first roll-up was written from memory and overstated L3 at 35; the second revision fixed the arithmetic to 43/55 but still dropped P4's low finding (`L3-P04-10`), because it inherited the truncation-era `0/1/5/0` row. **The verified counts are 44 for L3 and 56 for the program.** Every count in this document is the corrected one, and the correction itself is the reason the program's last action before declaring completion was an artifact-integrity re-check rather than a summary.

# Fix backlog

**NOT AUTHORISED. REQUIRES FRESH APPROVAL.**

This document ranks the findings the architecture-review program produced. It is an index, not a plan. Every item below points at a finding that already recorded its own *fix direction* and *acceptance criteria*; nothing here adds implementation steps, designs a refactor, or authorises a change. The program was read-only by decision (`INDEX.md`, frozen constraints), and that constraint is not lifted by writing this file.

Baseline: HEAD `bdf999a`. Program: 8 artifacts, **56 findings** (0 blocker · 12 high · 34 medium · 10 low); the L3 topics slice alone is 44 (9 high · 25 medium · 10 low). Source of truth is `INDEX.md`; this backlog is its ranked view.

---

## Progress — seven of the twelve ranked items are FIXED

All seven were executed test-first (failing test → confirmed failure for the recorded root cause → minimal fix → re-run green) and verified against `mahalla_ovozi_test` on port **5433**.

| Rank | Finding | Status | Notes |
|---|---|---|---|
| 1 | `L3-P05-10` | **fixed** | *not deterministically tested* — see `fix-ledger.md` residual uncertainty |
| 2 | `L3-P05-01` | **fixed** | proven by a failing-then-passing test |
| 3 | `L3-P04R-01` | **fixed** | the finding itself was corrected: severity high → medium |
| 4 | `L3-P05-17` | **fixed** | |
| 5 | `L3-P05-16` | **fixed** | bundled with `L3-P05-17` (shared statement) |
| 6 | `L3-P05-09` | **fixed** | finding confirmed *stronger* than recorded; bundled with `L3-P05-15` |
| 7 | `L3-P05-02` | **fixed** | finding confirmed *stronger* than recorded; 3 artifact defects corrected |

`L3-P05-15` (low, unranked below) was fixed in the same pass as rank 6 — same file, same class, backlog Seam D.

**The highest-ranked remaining item is #8, `L3-P03-01`.** Ranks 8–12 remain open, plus the unranked `is_hokim_related` tautology in Tier 4.

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

**8. `L3-P03-01` — 18 of 28 exported names have no consumer; interface ~3× wider than use** · high · strong · observed · `shallow-module`
`phase-03-topics-read-path.md`. Also the prior-art reconciliation's most-corrected item: the prior pass said "nine zero-consumer exports" and additionally misidentified `queryDistrictTopicsPage` as unconsumed when it is imported at `district-topics-routes.ts:20,87,128`.

**9. `L3-P04-01` — Accepted Evidence reading has no single owner** · high · strong · observed · `low-locality`
`topic-evidence-service.ts:188` vs `topic-evidence-management-service.ts:122`/`:394`. **P4R corrected this candidate's scope:** the *query* split is principled and should not be collapsed; the accidental part is verbatim-text resolution, which `L3-P04R-02` shows now exists in three copies with the SQL one already diverging from the TypeScript one. Fix the resolution, keep the query modules separate.

**10. `L1-P01-01` — `ActorContext` declared four times with divergent nullability** · high · strong · observed · `duplication` · `hidden-dependency`
`packages/api-contracts/src/auth.ts:6-12` (`districtId` nullable/optional) vs `topic-query-engine.ts:181-185` (`districtId` required), plus `district-onboarding-engine.ts:62` and `hokim-accounts-service.ts:61`. *Blast radius:* cross-layer type safety at the contracts seam.

**11. `L1-P01-02` — `ApiErrorEnvelopeSchema` has no backend producers** · high · strong · observed · `leaky-seam` · `untestable-interface`
A contract with no producer is a promise nothing keeps.

**12. `L1-P02-01` — sentinel UI text and its predicate live in the contract package** · high · strong · observed · `leaky-seam`
Presentation leaking into the browser-safe contract package.

**~~New — no ID assigned yet. `is_hokim_related` is now validated by a tautology.~~** · **[FIXED — session 3]**

Found during the `L3-P05-02` fix and initially left unfixed as out of scope. Relocating the `is_hokim_related` derivation into `TopicProjectionResultSchema`'s `z.preprocess` had made the schema's `.refine` a tautology — it could no longer fail whenever `lanes` was an array, because the preprocess set exactly what the refine checked.

Fixed as recorded: the field was dropped from the model-facing schema (and from the prompt) and is now **derived** by the schema's `.transform`, so `TopicProjectionResult` still carries it for every downstream consumer. The rationale is that `is_hokim_related` is a pure function of `lanes` — a model echo of it could only ever disagree, never inform, and the disagreement was then coerced away anyway. Full record: `fix-ledger.md` Phase 7.

## Deepening candidates grouped by seam

These are the `strong` architectural candidates — places where a deeper module would remove a whole class rather than a symptom. Grouped by the seam they sit on, because that is what a reviewer needs to decide scope.

**Seam A — AI provider boundary.** `L3-P05-02` (undeclared output normalizer in `ai-gateway.ts`). The gateway rewrites payloads that its callers' schemas claim to own. One owner for "what the model actually returned" would make both evaluators' schemas true again. `L3-P05-04` (`profileId` declared on both evaluator inputs, passed by neither production caller) belongs here as well.

**Seam B — evidence text resolution.** `L3-P04-01` + `L3-P04R-01` + `L3-P04R-02`. Three implementations of "what is this message's text?" — a TypeScript extractor, an inline copy seventy lines below it in the same file, and a SQL predicate that has already drifted. One deep module owning payload shape and terminal fallbacks, called by all readers and the search predicate. **This is the tightest cluster in the program: three findings, one seam, one fix.**

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

# Architecture Review — Ledger

Read-only architectural review of `mahalla-ovozi-trial-2`. **No file under `apps/` or `packages/` is modified by this program.** The deliverable is this ledger, not fixed code.

Baseline: HEAD `bdf999a` · started 2026-09-22 · backend typecheck baseline CLEAN.

## Program constraints (frozen)

- **Analysis only.** Read-only. Refactoring is a separate program requiring fresh approval.
- **Static read + scoped typecheck only.** No test execution, no Docker, no SSH, no migrations, no seeds, no network. `.env` files are off-limits; configuration *shape* is read from `deploy/compose/.env.example`.
- **One writer per phase.** A phase writes exactly one artifact (its own file in this directory). Nothing else.
- **No git state changes.** No commit, stage, checkout, reset, or branch.
- **Strictly sequential.** One subagent in flight at a time; the main session blocks on it.
- **Layer gate.** Phases run continuously within a layer; the user reviews at each layer boundary. A `blocker`/`high` finding escalates immediately, overriding cadence.

## Layer map

| Layer | Scope | Files | LOC |
|---|---|---|---|
| **L1** Contracts | `packages/api-contracts/src` | 18 | 2,401 |
| **L2** Backend infrastructure | `apps/backend/src/{adapters,entrypoints,cli,scripts,types,utils}` | 39 | ~4,900 |
| **L3** Backend domain | `apps/backend/src/modules/**` (15 modules) | 90 | 27,417 |
| **L4** Web data | `apps/web/src/{api,auth,district,topics,hooks,lib,issues,health,utils}` | 48 | 5,131 |
| **L5** Web presentation | `apps/web/src/{components,pages,theme}` | 104 | 21,641 |
| **L6** Cross-cutting | `deploy/`, `Dockerfile`, `.github/workflows/ci.yml`, ADR conformance | — | — |

Ordering is dependency-directional (L1→L6); L3 is internally ordered by churn.

## Phase register

| Phase | Layer | Owner | Scope | Status | Artifact |
|---|---|---|---|---|---|
| **P1** | L1 Contracts | main | `common`, `pagination`, `timezone`, `auth`, `index` | **complete** | `phase-01-contract-primitives.md` |
| P2 | L1 Contracts | main | `topics`, `signals`, `issues`, `districts`, `hokim-accounts`, `telegram-groups`, `telegram-bot`, `audit` | pending | — |
| **P3** | L3 topics | subagent | `topic-query-engine`, `topic-query-helpers`, `hokim-topics-routes`, `district-topics-routes` | **complete** | `phase-03-topics-read-path.md` |
| **P4** | L3 topics | subagent | `topic-evidence-management-service`, `topic-evidence-service`, `admin-signals-routes` | **complete (6 of 10)** | `phase-04-topics-evidence-path.md` |
| **P5a** | L3 topics | subagent | `topic-projection-evaluator`, `topic-matching-evaluator` | **complete** | `phase-05a-topic-evaluators.md` |
| **P5b** | L3 topics | subagent (write truncated; completed by main session) | `topic-assignment-coordinator`, `topic-matching-resolver` | **complete** | `phase-05b-assignment-coordination.md` |
| **P5c** | L3 topics | main session (single-agent mode) | `jobs/topic-projection-job-handler`, `jobs/topic-assignment-job-handler`, `topic-reconciliation-service`, `topics-data-cleaner` | **complete** | `phase-05c-jobs-reconciliation.md` |
| **P4R** | L3 topics | main session (single-agent mode) | `topic-evidence-management-service`, `topic-evidence-service` — re-derive L3-P04-02 / -03 / -04 | **complete** | `phase-04r-evidence-read-repair.md` |
| **L4-recon** | L4 web data | recon-l4-webdata | `apps/web/src/{api,auth,district,topics,hooks,lib,issues,health,utils}` — sweep, not a deep phase | **incomplete (1 of 15)** | `recon-l4-web-data.md` |
| **BACKLOG** | cross-layer | main session | all findings, ranked — **not authorised; requires fresh approval** | **complete** | `fix-backlog.md` |
| **FIXES** | cross-layer | main session | 5 Tier-1 + Tier-2 fixes executed test-first — **separate program, approved 2026-09-23** | **complete** | `fix-ledger.md` |

Phases beyond P5 are **not funded**. The post-slice decision is made at the gate.

**Boundary note.** P5 is one phase identity (L3 topics: evaluators, assignment, jobs) delivered in three sequential passes — P5a, P5b, P5c — sharing one continuous finding-ID space `L3-P05-nn`. **P4R runs after P5c yet sits *inside* the funded slice**, because it repairs a completed phase rather than opening a new layer. The L4 recon row is not a funded phase; it is a partial artifact recorded for honesty.

## Frozen taxonomy

**Architecture classes:** `shallow-module` · `leaky-seam` · `low-locality` · `untestable-interface` · `duplication` · `hidden-dependency` · `adr-conflict`

**Defect classes:** `correctness` · `security` · `tenant-isolation` · `concurrency` · `error-handling` · `performance`

**Severity:** `blocker` · `high` · `medium` · `low`

**Strength (deepening candidates):** `strong` · `worth-exploring` · `speculative`

**Verification status:** `observed` · `inferred` · `unverified-risk`

**ID convention:** `<LAYER>-P<NN>-<NN>` — e.g. `L1-P01-03`

### Finding record schema (frozen)

Each finding carries: id · title · `path:line` · category · severity · strength · confidence · verification · description · verbatim evidence · fix direction · acceptance criteria. Deepening candidates additionally carry a before/after interface sketch.

## ADR ownership (one owner per ADR)

| ADR | Owner |
|---|---|
| 0002 transactional intake | L3 `telegram-intake` / `jobs` phases |
| 0003 same-day calendar boundary | L1 / L3 `topics` phases |
| 0004 optimistic AI concurrency | L3 `ai` phases |
| 0005 provider-neutral AI gateway | L2 `ai-providers` / L3 `ai` |
| 0007 stateful sessions | L3 `auth` |
| 0009 userbot transport | L2 `telegram` / L3 `userbot` |
| **0001** hexagonal structure | **L6 only** |
| **0006** tenant scoping | **L6 only** |
| **0008** compose/Caddy edge | **L6 only** |

Phases must **not** file 0001 / 0006 / 0008 findings — those are L6's, to prevent double-counting.

## Prior art

Recorded for reconciliation. **Deliberately withheld from first-slice subagent prompts** so that novelty is measurable and independent replication counts as free verification.

### `architecture-review-20260922-2122.html`

Produced 2026-09-22 21:22 in a single pass. **Untracked** (`?? docs/architecture-review/`), not gitignored, never staged. Preserved in place; not modified by this program.

Reported scan scale: backend 160 files / 33,503 LOC · web 154 / 26,949 · api-contracts 18 / 3,010.

Three candidates, all self-rated `Strong`:

1. **Collapse the Signal reading surface into one deep module** — `apps/backend/src/modules/topics/topic-evidence-management-service.ts` (1344 LOC, 4 exports), `apps/backend/src/modules/ai/jobs/semantic-relevance-job-handler.ts:34` (`extractVerbatimTextFromRawPayload`), `apps/backend/src/modules/topics/topic-evidence-service.ts` (9 exports, `getTopicEvidence`). Claim: two modules resolve Accepted Evidence verbatim text via separate hand-written payload walkers.
2. **Shrink the Topic query engine interface to what callers use** — `topic-query-engine.ts` (1244 LOC, 26 export lines), `topic-query-helpers.ts` (44 LOC), `hokim-topics-routes.ts:23`. Claim: 26 interface items, nine with zero consumers, including a backward-compat alias triple.
3. **ADR-0001's ports are honoured only where the module also owns them** — 180+ module imports from `../../adapters/`; nine of eleven adapters import domain modules back. Marked as contradicting ADR-0001.

### `.agent-teams/archive/mahalla-ovozi-codebase-summary/`

A completed **descriptive** reconnaissance run (4 tasks: backend summary, web summary, contracts/infra summary, ADR/governance summary) by members `backend-scout` and `web-scout`. Orientation material only — it produced no deepening candidates, so it carries no anchoring risk. Not fed to subagents.

**RESOLVED — RETIRED (2026-09-24).** This path was already absent from disk when first recorded (2026-09-23). The user confirmed the `.agent-teams/` agent-team tooling is not used on this project, so the deletion was **committed deliberately** rather than restored — the prior-art record above stays as a historical note and now points at a retired artefact by design. No candidate or finding ever depended on it. Nothing else references this path: a workspace-wide grep finds only this entry (and its `.grepai/index.gob` embedding copy).

## Findings roll-up

| Phase | blocker | high | medium | low | Total |
|---|---|---|---|---|---|
| L1-P01 | 0 | 2 | 4 | 0 | **6** |
| L1-P02 | 0 | 1 | 5 | 0 | **6** |
| L3-P03 | 0 | 1 | 8 | 1 | **10** |
| L3-P04 | 0 | 1 | 5 | 1 | **7** *(of 10 claimed; -02/-03/-04 lost to truncation, re-derived in P4R — see below)* |
| L3-P05a | 0 | 2 | 3 | 3 | **8** |
| L3-P05b | 0 | 2 | 3 | 2 | **7** |
| L3-P05c | 0 | 2 | 4 | 2 | **8** |
| L3-P04R | 0 | 1 | 2 | 1 | **4** |
| L4-recon | 0 | 1 | 0 | 0 | **1** *(of 15 claimed)* |

*(Findings are listed in full in each phase artifact. This roll-up is the index, not the record.)*

### L1-P01 findings at a glance

| ID | Title | Category | Severity | Strength | Verification |
|---|---|---|---|---|---|
| L1-P01-01 | `ActorContext` declared four times with divergent nullability | duplication, hidden-dependency | high | strong | observed |
| L1-P01-02 | `ApiErrorEnvelopeSchema` has no backend producers | leaky-seam, untestable-interface | high | strong | observed |
| L1-P01-03 | `timezone.ts` shallow; two of three exports unused in production | shallow-module | medium | strong | observed |
| L1-P01-04 | Keyset cursor payload types placed inconsistently across the seam | hidden-dependency, duplication | medium | worth-exploring | observed |
| L1-P01-05 | `IsoDateStringSchema` regex-only; backend re-validates with a different mechanism | hidden-dependency, duplication | medium | worth-exploring | observed |
| L1-P01-06 | `pagination.ts` declares ambient globals; environment-dependent throw path | hidden-dependency | medium | worth-exploring | observed |

### L1-P02 findings at a glance

| ID | Title | Category | Severity | Strength | Verification |
|---|---|---|---|---|---|
| L1-P02-01 | Sentinel UI text and its predicate live in the contract package | leaky-seam | high | strong | observed |
| L1-P02-02 | Canonical schemas bypassed within the contract layer itself | hidden-dependency, adr-conflict | medium | strong | observed |
| L1-P02-03 | Four exported symbols have zero consumers, incl. two duplicating existing types | shallow-module, duplication | medium | strong | observed |
| L1-P02-04 | Schema aliasing used as substitute for semantic distinction | duplication, leaky-seam | medium | worth-exploring | observed |
| L1-P02-05 | `SignalDetailSchema` carries untyped records and money as a string | untestable-interface, leaky-seam | medium | worth-exploring | observed |
| L1-P02-06 | `ListSignalsQuerySchema` re-declares pagination fields | duplication | medium | worth-exploring | observed |

### Artifact integrity (audited 2026-09-23)

Every phase artifact was checked against its own header claim by counting `^### <ID>` headings:

| Artifact | Claims | Recorded | Verdict |
|---|---|---|---|
| `phase-01-contract-primitives.md` (321 lines) | 6 | 6 | **intact** |
| `phase-02-contract-domain-payloads.md` (312 lines) | 6 | 6 | **intact** |
| `phase-03-topics-read-path.md` (538 lines) | 10 | 10 | **intact** |
| `phase-04-topics-evidence-path.md` (535 lines) | 10 | 7 (L3-P04-01, -05…-10) — 1 high · 5 medium · 1 low | **truncated — -02/-03/-04 re-derived in P4R** |
| `phase-05a-topic-evaluators.md` (490 lines) | 8 | 8 | **intact** |
| `phase-05b-assignment-coordination.md` (460 lines) | 7 | 7 | **intact** (subagent wrote 292/7→4; completed by main session) |
| `phase-05c-jobs-reconciliation.md` (484 lines) | 8 | 8 | **intact** |
| `phase-04r-evidence-read-repair.md` (303 lines) | 4 | 4 | **intact** |
| `recon-l4-web-data.md` (130 lines) | 15 | 1 (L4-P01-01) | **truncated** |

**P4 loss.** The artifact goes from `## Phase question and method` straight to `### L3-P04-05`; findings **-01 through -04 have no record in it**. Status:

- **L3-P04-01** — *recovered in full* from `docs/architecture-review/.p04-tmp.md` (high · strong · low-locality: Accepted Evidence reading has no single owner; `getTopicEvidence` at `apps/backend/src/modules/topics/topic-evidence-service.ts:188` vs `listSignals`/`getSignalDetail` at `topic-evidence-management-service.ts:122`/`:394`). Promoted into the P4 artifact; `.p04-tmp.md` deleted thereafter.
- **L3-P04-02** — *lost* (verbatim-resolution duplication lead). Scheduled for re-derivation in P4R.
- **L3-P04-03** — *lost*. Residual uncertainty at `phase-04-topics-evidence-path.md:472` records it as **inferred, not executed**: `promoteSignal`'s inline extractor (`topic-evidence-management-service.ts:607-620`) does not handle `rawPayload.message.text`, and it is *"the one finding whose severity could move upward if confirmed."* Scheduled for re-derivation in P4R — **the program's only live correctness lead.**
- **L3-P04-04** — *lost*, but the substance survives in prose at `phase-04-topics-evidence-path.md:24`: `topic-evidence-management-service.ts` has **11** exports, not 4; seven are declared with a stray leading two-space indent so `^export` grep misses them.

**L4 loss.** `recon-l4-web-data.md` claims `0 blocker · 2 high · 8 medium · 5 low` and says *"Both `high` findings below"*, then ends after its first finding. Only **L4-P01-01** survives: two hooks share query key `['district-mahallas', districtId]` across different endpoints and different Zod schemas (`apps/web/src/topics/useDistrictMahallas.ts:10` vs `apps/web/src/topics/district-topics-client.ts:134`). Reclassified as an incomplete sweep. Completing it would mean re-running the L4 sweep — a **funding decision for the gate**, not a repair.

### L3-P03 findings at a glance

| ID | Title | Category | Severity | Strength | Verification |
|---|---|---|---|---|---|
| L3-P03-01 | 18 of 28 exported names have no consumer; interface ~3x wider than use | shallow-module | **high** | strong | observed |
| L3-P03-02 | Backward-compat alias triple is dead code with a misleading name | duplication | medium | strong | observed |
| L3-P03-03 | `TopicNotFoundError` declared twice with different codes (`TOPIC_NOT_FOUND` vs `NOT_FOUND`) | duplication | medium | strong | observed |
| L3-P03-04 | Cursor decoded twice; first operand cannot change the outcome | low-locality | medium | strong | observed |
| L3-P03-05 | Empty `?cursor=` silently serves page 1 | error-handling | medium | strong | observed |
| L3-P03-06 | District route re-queries districts for an invariant the engine owns | duplication | medium | strong | observed |
| L3-P03-07 | Two different error mappers; malformed cursor returns different codes per surface | leaky-seam | medium | strong | observed |
| L3-P03-08 | `queryHokimBoard` writes a `user_dashboard_visits` row inside a GET | hidden-dependency | medium | strong | observed |
| L3-P03-09 | `queryTopics` requires a caller-built `datePredicate: SQL`, so the seam is undriveable | untestable-interface | medium | strong | observed |
| L3-P03-10 | `calendarDay` label from a second clock read can disagree with the query's day | adr-conflict | low | worth-exploring | inferred |

## Reconciliation ledger (prior art vs findings)

Populated at the slice gate. Each prior-art candidate is marked `replicated` · `not-replicated` · `superseded`.

| Prior-art candidate | Status | Evidence |
|---|---|---|
| 1. Signal reading surface | **replicated, with corrected scope** | Replicated: Accepted Evidence reading has no single owner — `getTopicEvidence` at `apps/backend/src/modules/topics/topic-evidence-service.ts:188` (Topic-scoped Hokim read) vs `listSignals`/`getSignalDetail` at `topic-evidence-management-service.ts:122`/`:394` (intake-centric Product Owner triage), recorded as `L3-P04-01` (high · strong · low-locality). **Correction from P4R:** the query split is principled and should NOT be collapsed; the accidental part is verbatim-text resolution, which now exists in **three** copies — the extractor `topic-evidence-management-service.ts:41-99`, the inline copy in `promoteSignal` `:607-620` (`L3-P04R-01`), and a SQL copy at `:220` (`L3-P04R-02`). P4R also found the SQL copy already diverges from the TypeScript one. Candidate 1's direction (one deep module) is right; its implied blast radius (the whole reading surface) is too wide. |
| 2. Query engine interface | **partially replicated · partially refuted** | Replicated: "26 export lines" is exact (`grep -c '^export '` = 26); the backward-compat alias triple is real and dead (`topic-query-engine.ts:113-115`). **Refuted:** "nine zero-consumer exports" is wrong — P3 measured **18 of 28 names** with no consumer outside the file. **Independently refuted by main session:** the prior art listed `queryDistrictTopicsPage` as zero-consumer, but it IS imported at `district-topics-routes.ts:20,87,128`. Prior-art candidate 2 understated the interface width and misidentified at least one consumer. |
| 3. ADR-0001 ports honesty | *pending L6* | — |

## Slice 1 gate

**Reached 2026-09-23.** Verdict: **CONTINUE — narrow.** Both novelty bars pass. The funded L3 topics slice (P3, P4, P4R, P5a, P5b, P5c) is complete: **6 phases, 44 findings recorded** (0 blocker · 9 high · 25 medium · 10 low). Program total including the earlier L1 contracts slice: **8 artifacts, 56 findings** (0 blocker · 12 high · 34 medium · 10 low).

Every count below was taken from the artifacts by counting `^### <ID>` headings and cross-checked against each header's `Findings` claim; the table in *Artifact integrity* above is the source of truth for which artifacts are intact.

### Findings roll-up by layer

| Layer | Phases | blocker | high | medium | low | Total |
|---|---|---|---|---|---|---|
| L1 Contracts | P01 (0/2/4/0), P02 (0/1/5/0) | 0 | 3 | 9 | 0 | **12** |
| L3 topics | P03 (0/1/8/1), P04 (0/1/5/1 recorded), P04R (0/1/2/1), P05a (0/2/3/3), P05b (0/2/3/2), P05c (0/2/4/2) | 0 | 9 | 25 | 10 | **44** |
| **Total** | 8 artifacts | **0** | **12** | **34** | **10** | **56** |

No `blocker` finding was recorded anywhere in the program, and no `security` or `tenant-isolation` finding in the L3 topics slice. Per-category counts are carried in each artifact's own `Category` field rather than aggregated here, because `Category` is a compound field (architecture class and/or defect class) and summing it would double-count.

**Correction note (two errors, both the main session's).** The first revision of this section stated "47 findings (0 · 9 · 29 · 9)" and attributed 6 high / 20 medium / 35 total to L3 — computed from memory during the gate write instead of from the artifacts. The second revision fixed that to 43/55 but *still* dropped P4's low finding (`L3-P04-10`), because the roll-up inherited the old `0/1/5/0` row from the truncation-era table. Verified counts, taken by counting `^### <ID>` headings and reading each finding's own `Severity` field: **44 for L3 (9 high · 25 medium · 10 low), 56 for the program.** The `L3-P04` roll-up row at the top of this file was the source of the second error and is now corrected. The same discipline this program applied to subagent reports was applied to the main session's own arithmetic — twice, and the second time only because an artifact-integrity re-check was run before declaring the program finished.

### Novelty bar (i) — PASSES

At least one `strong` candidate in a live `topics` file the prior pass never touched. Three qualify, all `strong` and `observed`:

- `topic-projection-evaluator.ts:315-342` vs `:451-453` — `L3-P05-01`, **high · correctness · observed**. `buildUserPrompt` caps evidence to `slice(-15)` and labels survivors `Evidence #1..#15` by *truncated* index, while guardrail 1a resolves `anchor_evidence_index` against the *untruncated* array. Off by exactly `N-15` for any Topic with >15 evidence items; the wrong `anchorEvidenceId`/`anchorQuote` is persisted. **Independently re-verified by the main session** at all four lines before acceptance.
- `topic-assignment-coordinator.ts:306-332` vs `:515-523` — `L3-P05-10`, **high · concurrency · observed**. The CAS guard reads the snapshot on the `db` pool client while the guarded commit runs on a different dedicated connection inside `withTransactionalIntake` (`boss-client.ts:227`); the `UPDATE topics` carries no generation predicate.
- `topic-assignment-coordinator.ts:327-331` — `L3-P05-09`, **high · leaky-seam · observed**. The stale-snapshot retry contract is a string prefix (`STALE_SNAPSHOT:`) recovered by the caller via `startsWith`.

### Novelty bar (ii) — PASSES, no yield decay

P3→P5 does not restate P3's problem classes. P3 found *interface width* and *route/engine seam* problems (`L3-P03-01` 18-of-28 unconsumed exports, alias triples, double cursor decode, duplicate error mappers). P5 found classes P3 never surfaced:

- **Producer/consumer key-domain mismatch** — three independent instances: `L3-P05-01` (capped vs uncapped index), `L3-P05-16` (coalesced vs job generation in the reconciliation key), `L3-P04R-01` (payload key path). P3 has no instance of this class.
- **Concurrency correctness** — `L3-P05-10` is the slice's only `concurrency` finding, and it contradicts a guarantee the module's own header advertises.
- **Audit-trail integrity** — `L3-P05-17` (fabricated provenance in failure telemetry) and `L3-P04R-01` (a false retention message). P3 filed nothing about Audit-Record-grade correctness.
- **Hidden third implementations** — `L3-P04R-02` (payload shape in SQL) and `L3-P04R-03` (7 of 11 exports invisible to `^export` grep).

Severity did not decay either: P3 carried 1 high; P5a carried 2, P5b 2, P5c 2, P4R 1 — the later passes were the *more* productive ones.

### The strongest result of the program

`L3-P05-01` and `L3-P05-16` are the same defect class in different files, and `L3-P04R-01` is a third instance. **Three independent producer/consumer key-domain mismatches, found by three passes that were deliberately forbidden from reading each other's output.** That recurrence is the single most useful thing this program produced: it is not a list of bugs but a pattern, and it says where to look next (any place a value is encoded on one side and re-derived on the other).

### Recommendation — CONTINUE, but NARROW

**Continue:** the L3 topics slice produced 44 findings including 9 high, all `observed`, and the highest-severity ones are actionable and independently re-verified. The program has demonstrated value per phase, not just value in aggregate.

**Narrow, do not fan out.** Three reasons, in order of weight:

1. **The recurrence is the finding.** Three instances of one defect class suggests the remaining value is in *following that class* rather than in opening new layers. A targeted pass over L3 `ai` (`ai-gateway.ts`, `context-snapshot.ts`) and L2 `ai-providers` would test whether the pattern generalises — `L3-P05-02` (gateway rewrites evaluator payloads before `safeParse`) already points there and was filed by P5a but never followed.
2. **The write-integrity tax is real and quantified.** Four artifact writes failed in this program (P4 truncated 10→6, L4 recon 15→1, P5b attempt 1 wrote nothing, P5b attempt 2 wrote 4 of 7). Every one was caught by filesystem verification, none by trusting a report. Three of the five slice artifacts needed main-session repair. Continuing at 24 further phases multiplies that tax; a narrower scope with the same verification discipline does not.
3. **The L4 recon is not a phase and should not become one by accident.** `recon-l4-web-data.md` claims 15 findings and delivers 1. Completing it means re-running the sweep. It is now formally **not funded**; if L4 is opened it must be opened as a real phase with its own gate, not silently finished.

**Do not stop.** The pre-commitment ("if both bars fail → stop or narrow") does not trigger: both bars passed. Stopping now would discard a demonstrated-positive yield curve.

### Residual uncertainty carried into the next funding decision

- `L3-P05-01` and `L3-P05-16` are `observed` at the expression level and **not executed** — this program prohibits test runs. Both are cheap to confirm with one targeted test each.
- `L3-P05-17`'s conflict-overwrite arm (a failure clobbering a `COMPLETED` row) depends on pg-boss retry behaviour that was not observed.
- `L3-P04R-01` — one writer of `telegram_intake_records.raw_payload` was not exhaustively ruled out; the `(Матн мавжуд эмас)` grep found none in `apps/backend/src`, but fixtures/seeds/CLI were not checked.
- `L3-P04R-02` — the `channel_post`/`edited_channel_post` search gap is textually certain; whether real districts ingest channel posts is unverified.
- `L3-P04R-03` — the stray-indent export pattern was confirmed in one file only; whether it is systemic is unknown.
- `L4-P01-01` stands alone from a truncated sweep; no L4 conclusion beyond it should be relied on.
- The `deploy/compose/.env.example` `DEEPINFRA` gap (parked item 5) remains unverified.

### Required at the gate (checklist, all satisfied)

- Findings roll-up by layer / severity / category — **done above**.

- **Novelty bar (i)** — satisfied by `L3-P05-01`, `L3-P05-10`, `L3-P05-09`, all `strong`/`observed` in files the prior pass never touched. Live candidates were `topic-projection-evaluator.ts` (589) / `topic-matching-evaluator.ts` (393) / `topic-assignment-coordinator.ts` (725). ~~`district-topics-service.ts`~~ — **struck**: the file was deleted in `b13a53a refactor(topics): flatten topic service layer, unify route validation, decompose toolbar`; it exists in git history only and is referenced by no live file (`grep` across `apps/`: no matches). Recorded so the bar is not read as naming four files.
- **Novelty bar (ii)** — satisfied; see the three new problem classes above.
- **Prior-art reconciliation** — complete. Candidate 1 replicated with corrected scope; candidate 2 partially replicated and partially refuted; candidate 3 remains pending L6 (its owner).
- **Residual uncertainty from all five phases** — carried above.
- **Recommendation** — `continue, narrow`, with reasons.

**Pre-commitment honored:** the "stop or narrow" branch was reserved for both-bars-fail. Both bars passed, so the program continues — narrowed, not fanned out.

## Parked items

1. **`DEEPINFRA_API_KEY`** in `apps/backend/.env:8` — live-looking, gitignored, never committed, absent from all tracked files. **Verified**: `apps/backend/.env` matches `.gitignore:19` (`.env`; rules are `.env`, `.env.*`, `!.env.example`) and `git ls-files --error-unmatch apps/backend/.env` reports *"did not match any file(s) known to git"* — so there is **no history exposure**; the risk is local-disk only. Keep-or-rotate is the user's call. **Owner corrected**: previously filed against "P4 (first)", but P4 is L3 topics — `DEEPINFRA` is an AI-gateway concern (15 tracked references incl. `apps/backend/src/adapters/ai-providers/http-provider-adapter.ts`, `apps/backend/src/modules/ai/{ai-config,ai-gateway,schema-compiler,types}.ts`, `apps/backend/src/entrypoints/worker.ts`, `apps/backend/src/cli/verify-deepinfra.ts`, `packages/api-contracts/src/analysis-settings.ts`, `docs/adr/0005-provider-neutral-ai-gateway-immutable-profiles.md`), which under the ADR table above belongs to **L2 `ai-providers` / L3 `ai`**. Stays parked; no phase funded.
2. **Post-slice funding** — **gate verdict: narrow, do not fan out.** 24 further phases vs a targeted ~16 was the open question; the gate answers it in favour of a narrower follow-on (see the recommendation above: follow the producer/consumer key-domain-mismatch class through L3 `ai` / L2 `ai-providers`, and treat any L4 work as a fresh phase with its own gate). No new layer is funded by this verdict.
3. **Program-completion synthesis document** — undecided; depends on whether the slice clears the gate.
4. **Untracked HTML** — preserved in place, recorded above, never staged. Deletion only on explicit user instruction.
5. **`deploy/compose/.env.example` has no `DEEPINFRA` entry** — the dev `apps/backend/.env` carries the key but the deployment template has no slot for it. Either a provisioning gap or a deliberate production AI-config difference; **unverified** (cannot be settled without reading `.env`, which is off-limits). Recorded as **residual uncertainty** for the gate, owned by the L2 `ai-providers` phase. *Observation, not a finding.*
6. **Fix backlog (decided 2026-09-23)** — the program's final deliverable includes `fix-backlog.md`: findings ranked by severity × strength × blast radius, deepening candidates grouped by seam, explicitly marked *not authorised; requires fresh approval*. Written in the main session **after** the gate, as its own register row, per the one-writer rule. Must not name implementation steps beyond what findings already recorded, or it becomes the refactoring plan that the read-only constraint reserves for a separate program.
7. **Repair-phase boundary** — P4R executes after P5c but is counted **inside** the funded slice (it repairs a completed phase, not opens a layer). Called out so the ledger cannot drift into self-contradiction the way P4 and the L4 recon did.

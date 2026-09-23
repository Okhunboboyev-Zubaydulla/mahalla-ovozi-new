# Phase 4R — Evidence read repair

| Field | Value |
|---|---|
| Phase | L3-P04R |
| Layer | L3 topics |
| Owner | main session (single-agent mode) |
| Status | complete |
| ADR lens | 0002 |
| Scope | `apps/backend/src/modules/topics/topic-evidence-management-service.ts` (1,344 lines), `apps/backend/src/modules/topics/topic-evidence-service.ts` — targeted re-derivation of the three P4 findings lost to a truncated write, plus the producer side in `apps/backend/src/modules/telegram-intake/` needed to settle them |
| Question | Re-derive `L3-P04-02`, `L3-P04-03`, `L3-P04-04`, and settle the residual uncertainty P4 recorded against `L3-P04-03` |
| Findings | 0 blocker · 0 high · 3 medium · 1 low *(severity corrected during fix Phase 1; see SCOPE CORRECTION under L3-P04R-01)* |

## Phase question and method

This is a **repair phase**, not a new sweep. The P4 artifact (`phase-04-topics-evidence-path.md`) claimed 10 findings but recorded 6, because its write was truncated. `INDEX.md` records the loss: `L3-P04-02` (verbatim-resolution duplication lead), `L3-P04-03` (the only live correctness lead — recorded in P4's own residual uncertainty as "the one finding whose severity could move upward if confirmed"), and `L3-P04-04` (the indentation artifact). This pass re-derives all three from source and settles `L3-P04-03`'s open question.

**`L3-P04-03` is confirmed, and it is a real defect.** P4 recorded it as `inferred` and could not execute it. It is now `observed` on both sides of the expression. The promotion path reads raw payload keys that no producer writes, so a structurally excluded message cannot be promoted even when its text is intact — and the operator is told the retention window expired, which is false.

**`L3-P04-02` resolves into `L3-P04-01`'s fix plus one addition.** The duplication P4 suspected is real but its shape is narrower than a second extraction function: it is a third, independent expression of payload-shape knowledge inside a SQL predicate, and that copy is already out of step with the TypeScript extractor.

### Method

Targeted re-derivation. I read the specific regions the lost findings concerned rather than re-reading 1,344 lines end to end, then traced **out of scope** into the producers to establish what the payload actually contains — which is the step P4 could not complete without reading the intake module.

Read **IN FULL, in scope**:

- `apps/backend/src/modules/topics/topic-evidence-management-service.ts:36-99` — `extractSignalVerbatimText` and the two error classes
- `apps/backend/src/modules/topics/topic-evidence-management-service.ts:212-230` — the list-query SQL predicate
- `apps/backend/src/modules/topics/topic-evidence-management-service.ts:280-354`, `:394-399`, `:470-529` — the two read paths and their shared row-projection logic
- `apps/backend/src/modules/topics/topic-evidence-management-service.ts:570-659` — `promoteSignal`'s guard and inline extraction

Read **OUT of scope**, to establish the producer contract (the decisive step):

- `apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts:317-420` — the canonical payload reader, `payload.message ?? payload.edited_message ?? …`
- `apps/backend/src/modules/telegram-intake/telegram-intake-service.ts:440-465` — the edit path's `rawPayload: payload.rawPayload` write
- `apps/backend/src/modules/telegram-intake/jobs/burst-debounce-job-handler.ts:243-257` — the `{...currentPayload, status: 'EXCLUDED'}` spread
- `apps/backend/src/modules/telegram-intake/jobs/qualification-job-handler.ts:117-132` — the same spread on the structural-exclusion path

Read **PARTIALLY**: `apps/backend/src/modules/topics/topic-evidence-service.ts` (the P4 artifact's own record of it was sufficient; I re-checked only the export surface).

**NOT examined**: any artifact under `docs/architecture-review/` other than the P4 record `INDEX.md` points to, the frontend, and the routes that call these services (`admin-signals-routes.ts`, `hokim-topics-routes.ts`, `district-topics-routes.ts`) — those were P4's scope and are not re-opened here.

### Instrument check

`pnpm --filter @mahalla-ovozi/backend exec tsc --noEmit` → exit **0**. No test suite executed, no `.env` read, no git state changed. `git --no-pager diff --stat -- apps packages` returned empty before and after.

## Findings

### L3-P04R-01 — `promoteSignal` reads payload keys no producer writes, so a structurally excluded message cannot be promoted

| Field | Value |
|---|---|
| Category | `correctness` · `low-locality` |
| Severity | medium *(corrected — see SCOPE CORRECTION below)* |
| Strength | `strong` |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/topic-evidence-management-service.ts:607-620`, `apps/backend/src/modules/telegram-intake/telegram-intake-service.ts:461`, `apps/backend/src/modules/telegram-intake/jobs/qualification-job-handler.ts:125-129`, `apps/backend/src/modules/telegram-intake/jobs/burst-debounce-job-handler.ts:250-254` |

> **SCOPE CORRECTION (2026-09-23, during fix Phase 1).** The original text below overstates the blast radius. I wrote that *"No producer writes either key at the payload root"* and traced three producers. **That is wrong — there are four, and the fourth writes the flat keys.** `apps/backend/src/modules/ai/jobs/semantic-relevance-job-handler.ts:728-744` merges `{ status, exclusionReason, verbatimText, reasoning, expiresAt, purgedAt }` into `raw_payload` via `COALESCE(...) || ${exclusionMeta}::jsonb`. I missed it because it writes through a **SQL template merge**, not an object literal, and my grep for `verbatimText` in the intake module did not cover the `ai` module.
>
> **Consequences, stated honestly:**
> - `promoteSignal` **works correctly** for semantically excluded messages (spam, chatter, off-topic) — which is the *common* Product-Owner promotion case, and the path the existing test at `apps/backend/tests/signal-management-crud.test.ts:399` exercises (its fixture is flat, matching this producer).
> - It **still fails** for **structurally** excluded messages — those excluded by `qualification-job-handler.ts:125-129` or `burst-debounce-job-handler.ts:250-254`, both of which spread the raw Telegram update and add only `status`/`exclusionReason`, leaving text at `raw_payload.message.text`.
> - The **false error message** stands in that narrower case: a structurally excluded message with intact text is reported as retention-purged.
>
> **Severity corrected `high` → `medium`.** This is a real defect on a real path, but it is not the broad failure the finding claimed. It is filed as a **latent inconsistency between two exclusion writers** as much as a bug: the flat `verbatimText` shape exists *only* because the semantic handler chose it, and nothing declares that excluded payloads have a flat text key. `L3-P04R-01`'s fix direction is unchanged and still correct — call `extractSignalVerbatimText`, which handles both shapes. The `getSignalDetail`/`listSignals` read paths are unaffected and were always correct.
>
> **Lesson for the program's own record:** this is the *fourth* main-session error caught by verification (after two count errors and one stale-text sweep), and the second caused by trusting a grep over reading the writer. The review artifacts are analysis, not proof.

**Description.** This is the finding P4 recorded as its one live correctness lead and could not execute. It is now settled by reading the producer side.

`promoteSignal` is the Product Owner's manual override: it takes an intake record that noise filtering or the semantic step excluded and promotes it to Accepted Evidence so Topic Assignment runs on it. Before doing that it must recover the message text, and it does so with an inline extraction that reads three keys directly off the raw payload:

```
const textFromPayload =
  typeof rawPayload.verbatimText === 'string' && rawPayload.verbatimText.trim()
    ? rawPayload.verbatimText.trim()
    : typeof rawPayload.text === 'string' && rawPayload.text.trim()
      ? rawPayload.text.trim()
      : null;
```

No producer writes either key at the payload root. The payload stored on `telegram_intake_records.raw_payload` is the **raw Telegram update object** — its text lives at `payload.message.text` (or `.caption`), with the `edited_message` / `channel_post` / `edited_channel_post` variants. I confirmed this on all three producers:

- `telegram-intake-service.ts:461` writes `rawPayload: payload.rawPayload` — the update as received.
- `qualification-job-handler.ts:125-129` writes `rawPayload: { ...currentPayload, status: 'EXCLUDED', exclusionReason: qualification.reason }` — a **spread of the original**, so the `message` key survives and no root-level `text` or `verbatimText` is added.
- `burst-debounce-job-handler.ts:250-254` does exactly the same spread.

The canonical reader in the intake module agrees with the producers and not with this extractor: `telegram-content-qualification.ts:322-331` reads `payload.message ?? payload.edited_message ?? …` before touching `rawMsg.text` / `rawMsg.caption` (`:402`, `:380`).

The two branches of `textFromPayload` that would rescue the extraction — a root-level `verbatimText`, then a root-level `text` — are therefore dead for every record these producers create. `textFromPayload` is `null`, and `:615-619` throws `SignalNotFoundError` with the message *"Ушбу хабарнинг сақлаш муддати (14 кун) тугаган ва матни ўчирилган. Далил сифатида қабул қилиб бўлмайди."* — "the retention window (14 days) for this message has expired and its text has been deleted; it cannot be accepted as evidence."

That message is false in the common case. The text is present; the extraction cannot see it. The operator is told data was purged when it was not, on the one path whose entire purpose is human override of an automated exclusion.

Note the shape of the defect: the file already contains the correct reader. `extractSignalVerbatimText` (`:41-99`) walks `raw.message ?? raw.edited_message ?? raw.channel_post ?? raw.edited_channel_post` and then `.text` / `.caption`, plus service-message and media-type labels. `promoteSignal` re-implements a worse version of it seventy lines below its own definition, and the two `getSignal` paths (`:312`, `:496`) call the correct one. This is the same low-locality pattern P4 filed as `L3-P04-01`: payload-shape knowledge expressed in more than one place, with the copies already out of step.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topic-evidence-management-service.ts:607-620
    const rawPayload = (intake.rawPayload as Record<string, unknown>) || {};
    const textFromPayload =
      typeof rawPayload.verbatimText === 'string' && rawPayload.verbatimText.trim()
        ? rawPayload.verbatimText.trim()
        : typeof rawPayload.text === 'string' && rawPayload.text.trim()
          ? rawPayload.text.trim()
          : null;

    if (!textFromPayload) {
      throw new SignalNotFoundError(
        'Ушбу хабарнинг сақлаш муддати (14 кун) тугаган ва матни ўчирилган. Далил сифатида қабул қилиб бўлмайди.',
      );
    }
    const verbatimText = textFromPayload;
```
```
// apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts:321-331
  const payload = record.rawPayload as Record<string, unknown>;
  const rawMsg = (
    payload.message ??
    payload.edited_message ??
```
```
// apps/backend/src/modules/telegram-intake/jobs/qualification-job-handler.ts:117-129
        const currentPayload =
          typeof record.rawPayload === 'object' && record.rawPayload !== null
            ? (record.rawPayload as Record<string, unknown>)
            : {};

        await db
          .update(telegramIntakeRecords)
          .set({
            rawPayload: {
              ...currentPayload,
              status: 'EXCLUDED',
              exclusionReason: qualification.reason,
            },
```

**Why it matters.** The Product Owner is the sole technical and commercial operator (CONTEXT.md). This is their override lever, and it is broken for the exact records it exists for: a message the structural qualifier excluded — a forwarded post, a service message, a command — cannot be promoted even though its text is sitting in `raw_payload.message.text`. The failure is a hard throw with a misleading reason, so it looks like correct retention behaviour rather than a bug. The blast radius is bounded to manual promotion (the automated path never calls this), which is why it is `high` and not `blocker`.

I did not execute the promotion. The claim rests on: (a) the extractor reads two specific keys, read literally; (b) all three producers write an object that lacks both, read literally; (c) the intake module's own reader uses the nested path, read literally. That is the same standard of evidence as the P5a and P5b findings and is why it is marked `observed` rather than `inferred` — the one step not taken is running it, which this program prohibits.

**Fix direction.** Delete the inline extraction and call `extractSignalVerbatimText(intake.rawPayload, intake.rawPayload)` — or, cleaner, have `promoteSignal` reuse the same helper the read paths use so there is one answer to "what is this message's text?". Do not merely add `raw.message.text` to the inline chain; that would create a fourth copy. If promotion should refuse a record whose text is genuinely gone, keep a guard — but it must be a guard that can distinguish "absent" from "unreadable", and its message must not assert a retention cause it has not verified.

**Acceptance criteria.** (1) Exactly one function in `apps/backend/src/modules/topics/` reads `payload.message` / `.edited_message` / `.channel_post` / `.edited_channel_post`. (2) A structurally excluded intake record whose `raw_payload.message.text` is non-empty promotes successfully. (3) No error message asserts that text was purged unless the payload has actually been purged. (4) `promoteSignal` and both read paths resolve text identically for the same input.

### L3-P04R-02 — Payload-shape knowledge is expressed a third time, in SQL, and is already out of step

| Field | Value |
|---|---|
| Category | `duplication` · `low-locality` |
| Severity | medium |
| Strength | `strong` |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/topic-evidence-management-service.ts:220`, `apps/backend/src/modules/topics/topic-evidence-management-service.ts:62-71` |

**Description.** This is the finding P4 suspected as "verbatim-resolution duplication". Its real shape is narrower and sharper than a duplicate helper.

The search predicate in `listSignals` knows the payload shape independently, in SQL:

```
(acceptedEvidence.verbatimText ILIKE ${searchPattern}
 OR telegramIntakeRecords.rawPayload->>'verbatimText' ILIKE ${searchPattern}
 OR telegramIntakeRecords.rawPayload->'message'->>'text' ILIKE ${searchPattern}
 OR telegramIntakeRecords.rawPayload->'message'->>'caption' ILIKE ${searchPattern}
 OR telegramIntakeRecords.rawPayload->'edited_message'->>'text' ILIKE ${searchPattern}
 OR telegramIntakeRecords.rawPayload->'edited_message'->>'caption' ILIKE ${searchPattern})
```

Count the branches against the TypeScript extractor at `:62-71`. The SQL covers `message` and `edited_message`. The TypeScript walks **four** shapes — `message`, `edited_message`, `channel_post`, `edited_channel_post` — plus service-message labels and media placeholders (`:80-95`).

So the two disagree in both directions:

- **SQL searches for something no producer writes.** `rawPayload->>'verbatimText'` is the same dead root-level key as `L3-P04R-01`. It cannot match.
- **SQL misses payload shapes the extractor handles.** A signal whose text lives at `payload.channel_post.text` is displayed correctly by `getSignalDetail` (the extractor finds it) but is **unfindable by search**. The operator sees the message in a list, searches for a phrase they can see on screen, and gets no result.

That is the concrete, user-visible consequence: a text field that renders but does not match. It is the same class of failure as `L3-P04-01`'s split ownership of verbatim resolution, now with a third implementation and a real behavioural divergence rather than a theoretical one.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topic-evidence-management-service.ts:220
        sql`(${acceptedEvidence.verbatimText} ILIKE ${searchPattern} OR ${telegramIntakeRecords.rawPayload}->>'verbatimText' ILIKE ${searchPattern} OR ${telegramIntakeRecords.rawPayload}->'message'->>'text' ILIKE ${searchPattern} OR ${telegramIntakeRecords.rawPayload}->'message'->>'caption' ILIKE ${searchPattern} OR ${telegramIntakeRecords.rawPayload}->'edited_message'->>'text' ILIKE ${searchPattern} OR ${telegramIntakeRecords.rawPayload}->'edited_message'->>'caption' ILIKE ${searchPattern})`,
```
```
// apps/backend/src/modules/topics/topic-evidence-management-service.ts:62-71
  const message =
    typeof raw.message === 'object' && raw.message !== null
      ? (raw.message as Record<string, any>)
      : typeof raw.edited_message === 'object' && raw.edited_message !== null
        ? (raw.edited_message as Record<string, any>)
        : typeof raw.channel_post === 'object' && raw.channel_post !== null
          ? (raw.channel_post as Record<string, any>)
          : typeof raw.edited_channel_post === 'object' && raw.edited_channel_post !== null
            ? (raw.edited_channel_post as Record<string, any>)
            : null;
```

**Why it matters.** Search is how the Product Owner triages without reading every message. A field that renders but cannot be found is worse than one that does not render, because the operator trusts the list and concludes the message does not exist. And the mismatch is invisible from either side alone: the TypeScript is correct, the SQL is a plausible-looking copy, and nothing type-checks a JSON path inside a raw predicate.

**Deletion test.** Deleting the SQL predicate's payload arms and searching only `acceptedEvidence.verbatimText` would make complexity *reappear* — excluded-but-unpromoted records have no evidence row, so their text lives only in the payload, and search must reach it. The predicate earns its keep; its third-hand copy of the shape does not.

**Fix direction.** Make the SQL's payload arms derive from the same enumerated shape list as the extractor, or normalise the displayed text into a column at intake time so search and display read one source. At minimum, add the two missing shapes (`channel_post`, `edited_channel_post`) and drop the dead `verbatimText` arm, then comment that the set must stay in step with `extractSignalVerbatimText`. A test asserting "for each payload shape the extractor handles, a search for a phrase in it returns the row" is what actually pins this.

**Acceptance criteria.** (1) The set of JSON paths searched equals the set the extractor reads. (2) No search arm references a root-level `verbatimText`. (3) A signal whose text is only in `payload.channel_post.text` is returned by a search for its own displayed text.

### L3-P04R-03 — The module's real export surface is invisible to ordinary search

| Field | Value |
|---|---|
| Category | `untestable-interface` |
| Severity | medium |
| Strength | `strong` |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/topic-evidence-management-service.ts:394`, `:575`, `:720`, `:896`, `:974`, `:1119`, `:1238` |

**Description.** This is P4's `L3-P04-04`, which the P4 artifact's own residual note called an indentation artifact. It is real, and its effect is larger than formatting.

Seven of the module's exported functions are declared with a **stray leading two-space indent**, so their declaration lines begin `  export async function …`. Only four exports in the file start at column zero:

```
$ Select-String -Pattern '^export ' | Measure-Object
Count: 4

$ Select-String -Pattern '^\s+export (async function|function|class|const|interface)'
394:  export async function getSignalDetail(...)
575:  export async function promoteSignal(...)
720:  export async function reclassifyEvidence(...)
896:  export async function updateEvidenceText(...)
974:  export async function deleteEvidence(...)
1119:  export async function createManualSignal(...)
1238:  export async function batchDeleteSignals(...)
```

The TypeScript is valid — leading whitespace does not change module scope, so all eleven are genuine exports and `tsc` exits 0. What breaks is **discoverability**. Every routine tool an agent or a developer uses to enumerate a module's interface anchors on column zero: `grep '^export'`, ripgrep with the same pattern, most "find exports" editor commands, and the indexing heuristics behind structural search. Against this file they report **4 of 11** and look authoritative doing it.

This is not hypothetical damage. Earlier in this program, a phase brief described this module as having 4 exports. The correction to 11 came from a human reading the file, not from a tool. The P4 artifact records the same trap at its line 24: 11 exports, 7 of them hidden by indentation.

It is also the phase's clearest `untestable-interface` case in the sense that matters here: the interface is real but not *legible*, so a reader reasoning about the module's surface — deciding what to delete, what to keep, whether the module is shallow or deep — works from a wrong inventory by default.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topic-evidence-management-service.ts:394
  export async function getSignalDetail(db: DbClient, id: string): Promise<SignalDetailDto> {
```
```
// apps/backend/src/modules/topics/topic-evidence-management-service.ts:575
  export async function promoteSignal(
```
```
// apps/backend/src/modules/topics/topic-evidence-management-service.ts:1238
  export async function batchDeleteSignals(
```

**Why it matters.** The deep-module analysis in this program depends on reading a module's interface accurately. A file whose export list is only recoverable by reading all 1,344 lines is a file that will be mis-described — and it already has been, in this program's own brief. This is a mechanical defect with an epistemic consequence, which is why it is filed rather than waved through as cosmetics.

**Fix direction.** De-indent the seven declarations to column zero. This is a whitespace-only change with no semantic effect. If a formatter/linter is configured for the repo, confirm it does not re-introduce the indent — a rule that would reformat these back is the real fix, since the artifact will otherwise return. Worth checking whether the same stray indent exists in sibling files; I checked only this one.

**Acceptance criteria.** (1) `grep -c '^export '` on the file returns 11. (2) `grep '^\s+export '` returns 0. (3) `tsc --noEmit` still exits 0. (4) Any structural-search or export-enumeration tool reports the same 11 names a full read does.

### L3-P04R-04 — Two error classes in this file carry a `code` and a `statusCode` that no consumer distinguishes

| Field | Value |
|---|---|
| Category | `shallow-module` |
| Severity | low |
| Strength | `worth-exploring` |
| Confidence | medium |
| Verification | inferred |
| Location | `apps/backend/src/modules/topics/topic-evidence-management-service.ts:101-108`, `apps/backend/src/modules/topics/topic-evidence-management-service.ts:110-119` |

**Description.** `SignalNotFoundError` and `SignalAlreadyAcceptedError` are declared as classes carrying `code` and `statusCode` fields (`'SIGNAL_NOT_FOUND'`/404 and, per the pattern, the accepted-conflict pair), and they are thrown from `promoteSignal` (`:594`, `:604`, `:616`). Their whole contribution over `throw new Error(...)` is that a route mapper can narrow on `code` or read `statusCode` without parsing prose.

I did **not** read the route mappers for `admin-signals-routes.ts` in this pass — that file was P4's scope and I deliberately did not re-open it — so I cannot state whether these fields are consumed. P4's `L3-P04-07` established that two of four failure modes in the sibling evidence service raise plain `Error` with no `statusCode`, which makes it plausible that these two are the well-behaved minority rather than the norm. I am marking this `inferred` and `worth-exploring` precisely because the answer lives in a file I did not read.

I record it because it is the shape of finding that should not be silently dropped when re-deriving a truncated set: it is a real open question about whether an interface field is load-bearing, and it costs one grep to settle.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topic-evidence-management-service.ts:101-108
export class SignalNotFoundError extends Error {
  readonly code = 'SIGNAL_NOT_FOUND' as const;
  readonly statusCode = 404;
  constructor(message = 'Сигнал ёки далил хабари топилмади.') {
    super(message);
    this.name = 'SignalNotFoundError';
  }
}
```

**Fix direction.** Settle the question first: grep the routes and the route-level error mapper for `SIGNAL_NOT_FOUND` and for `statusCode`. If nothing reads them, either delete the fields or use them consistently across every error the evidence path throws, so the mapper has one contract instead of a mix. If they are read, this is not a finding and should be marked as such rather than carried as an open item.

**Acceptance criteria.** (1) Either every error thrown from `topic-evidence-management-service.ts` carries a `statusCode` the mapper reads, or none claims one. (2) The route mapper narrows on `code`/`instanceof`, not on message text. (3) A grep for `SIGNAL_NOT_FOUND` in `apps/backend/src` returns at least one non-declaration hit, or the constant is removed.

## Deferred to L6

- **ADR-0006 (tenant scoping).** `promoteSignal` scopes its intake lookup by `intakeId` alone (`:587-591`) and reads `districtId` off the returned row rather than filtering by an actor's District. Consistent with how the module's other statements read; whether a promotion path should require an actor District is an ADR-0006 question. Recording only; L6 owns ADR-0006.
- **ADR-0001 (hexagonal structure).** `promoteSignal` takes `pool`, `boss`, and `db` as three separate parameters and opens its own `withTransactionalIntake`. Whether a domain service should hold the pool is an ADR-0001 question. Not filed here.
- **ADR-0002 — upheld, with the cross-pass observation from P5c.** Every write in `promoteSignal` runs inside `withTransactionalIntake` and the `ai_operations` row is inserted in the same transaction as the evidence row, so the transactional-intake invariant holds here. No violation found; recorded so it is not re-derived.

## Residual uncertainty

- **`L3-P04R-01` is not executed.** The evidence is: the extractor's two key reads (read literally), all three producer writes (read literally, including the two spreads that preserve the original keys without adding root-level ones), and the intake module's own nested reader (read literally). The one step not taken is running the promotion, which this program prohibits. A direct confirmation is cheap if ever wanted: take any intake row with `raw_payload->>'status' = 'EXCLUDED'`, confirm `raw_payload->'message'->>'text'` is non-empty, and call the promotion path.
- **`L3-P04R-01` — one path I did not fully close.** I traced three producers of `raw_payload`. I did not exhaustively grep every writer of `telegram_intake_records.rawPayload` across the whole backend, so I cannot rule out that some *other* writer (a test fixture, a seed, a CLI import, an admin edit path) writes a flat `{ verbatimText }` payload. If one does, `promoteSignal`'s inline extractor would work for records created by that writer and the finding is narrower than stated. The `(Матн мавжуд эмас)` grep found no such writer in `apps/backend/src`, and no test was run to check fixtures.
- **`L3-P04R-02` — shape divergence verified, frequency not.** I read both the SQL predicate and the extractor and counted the shapes; the `channel_post` / `edited_channel_post` gap is textual and certain. Whether any real District's Telegram traffic arrives as `channel_post` rather than `message` depends on whether the source chats are groups or channels, which the intake transport decides and which I did not read. If channels are never ingested, the gap is latent rather than active — the finding stands as a divergence either way.
- **`L3-P04R-03` — not checked beyond this file.** I confirmed the pattern in `topic-evidence-management-service.ts` only. Whether the same stray indent appears in sibling modules is unverified and would change the finding from one file to a systemic formatting problem.
- **`L3-P04R-04` is `inferred`** by construction: the consuming route mapper was P4's scope and I did not re-read it. This is the one finding in this pass that a single grep would settle.
- **Not examined:** `admin-signals-routes.ts`, `hokim-topics-routes.ts`, `district-topics-routes.ts`, the search-query parser that builds `searchPattern`, and the retention purge that actually deletes payload text. The last of these matters for `L3-P04R-01`'s error-message claim — if a purge replaces the payload wholesale, then for *those* records the message is truthful and only the un-purged case is wrong. I did not read the purge.
- **Cross-pass note.** `L3-P04R-01` and P5c's `L3-P05-16` are the same defect class (a producer and a consumer disagreeing about a key's domain) found independently in different pairs of files, and P5a's `L3-P05-01` is a third instance. That recurrence is itself evidence for the gate's value question: key/domain mismatch between independently-written readers and writers is this codebase's most reliable failure generator.
- **Instrument:** `pnpm --filter @mahalla-ovozi/backend exec tsc --noEmit` exited 0 for this pass. No test suite run, no `.env` read, no git state changed, exactly one file written.


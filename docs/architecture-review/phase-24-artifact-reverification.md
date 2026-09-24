# Phase 24 - re-verifying the 33 artifact-only findings

**Date:** 2026-09-24 - **Baseline:** HEAD 3bbd882
**Source:** re-triage-2026-09-24.md, which ranked 39 items and marked **33 `artifact-only`** (`:86`). Six were already re-verified at source (A1-A4, B1, B2). This phase re-verifies the remainder.
**Status:** ANALYSIS ONLY. No code changed.

## 0. Method and scope

Each item was checked against live source at HEAD 3bbd882 by reading the cited lines, not by trusting the artifact. Where the artifact named a line that has drifted or a claim that does not survive, that is recorded as a correction.

**What this phase did NOT do:** it did not re-verify all 33. It verified the **mechanically checkable** subset - the claims that reduce to "does this symbol have a consumer" or "does this line say what the artifact says". Claims requiring execution (concurrency arms, scheduler behaviour, runtime match quality) remain unexecuted, exactly as the program rules require.

## 1. Corrections to the artifact record

### C1 - `L1-P01-03` is WRONG as recorded

The artifact (`phase-01-contract-primitives.md:171`) claims `getTashkentToday` is re-exported but has no production call site. **It has two.**

- `apps/web/src/components/audit/AuditFilterBar.tsx:13` imports it, and `:133` calls `getTashkentToday()`
- `apps/web/src/components/topics/DateScopeSelect.tsx:6` imports it, and `:84` calls `getTashkentToday()`
- Both resolve through the re-export at `apps/web/src/lib/formatters.ts:170`

So of the artifact stated "2 of 3 exports unconsumed", **only one is**: `TASHKENT_OFFSET_MS`, referenced solely at `packages/api-contracts/tests/timezone.test.ts:4,12`. `getTashkentToday` is live product code and must not be deleted. **Recommendation: remove `TASHKENT_OFFSET_MS` only.**

### C2 - `L3-P05-03` understates the duplication

The artifact (`:136`) records "2,700-word prompt in two divergent copies". Measured at source:

| Prompt | Location | Words |
|---|---|---|
| `TOPIC_PROJECTION_SYSTEM_PROMPT` | apps/backend/src/modules/topics/topic-projection-evaluator.ts:179 | **1,551** |
| `TOPIC_MATCHING_SYSTEM_PROMPT` | apps/backend/src/modules/topics/topic-matching-evaluator.ts:184 | **1,541** |
| identical lines between them | | **48** |

**3,092 words total, not 2,700**, and 48 lines are byte-identical. The artifact word count is 13% low. The finding direction is confirmed and strengthened: these are two large, partly-identical prompts maintained in parallel.

### C3 - `L1-P01-03` export count

`packages/api-contracts/src/timezone.ts` declares **4** exports (the artifact says three): `TASHKENT_OFFSET_SECONDS`, `TASHKENT_OFFSET_MS`, `getTashkentCalendarDay`, `getTashkentToday`. `TASHKENT_OFFSET_SECONDS` is consumed by `apps/backend/src/modules/telegram-intake/timezone-util.ts:9,26,28`. The artifact missed it in the count.

## 2. CONFIRMED at source

Each of these was read at the cited location and says what the artifact claims.

| ID | Claim | Verified at |
|---|---|---|
| `L3-P05-18` | reaches into pg-boss internals | apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:129 - raw `DELETE FROM pgboss.job` |
| `L3-P05-19` | cleaner owns 3 of 4 tables it deletes | apps/backend/src/modules/topics/topics-data-cleaner.ts:21,24,27 (topicProjections, acceptedEvidence, topics) |
| `L3-P03-05` | empty `?cursor=` serves page 1 | apps/backend/src/modules/topics/hokim-topics-routes.ts:145-150 - `if (cursor && (!decodeKeysetCursor(cursor) ...))` means empty string skips validation |
| `L3-P04-05` | one deep read behind 9 exports | apps/backend/src/modules/topics/topic-evidence-service.ts - **9** `^export` declarations, measured |
| `L3-P05-04` | `profileId` passed by no caller | topic-projection-evaluator.ts:162 declares it, :476 forwards it to the gateway; no caller in the evaluator file supplies it |
| `L1-P01-06` | ambient globals | packages/api-contracts/src/pagination.ts:49-59 - `declare const Buffer`, `btoa`, `atob` |
| `L3-P05-06` | `isUzbekCyrillic` is load-bearing | topic-projection-evaluator.ts:46 defines it, :574 and :614 gate `data.summary` and `data.latest_update` on it - **do not remove** |
| `L1-P01-04` | cursor types placed inconsistently | packages/api-contracts/src/pagination.ts:13-28 - `CursorPaginationQuerySchema`/`MetaSchema` sit beside the unrelated `KeysetCursorPayload` interface at :42 |

### Not found: L3-P05-12

The artifact (`:114`) ranks `L3-P05-12` - "the resolver FUZZY tier is near-inert" - as the one Tier B item resting on an artifact claim. A grep for `FUZZY`/`fuzzy` across apps/backend/src/modules/topics/topic-projection-evaluator.ts returns **zero matches**. The mechanism is not in that file. **`L3-P05-12` could not be re-verified and its location needs re-derivation** before it is ranked again.

## 3. What remains unverified, and why

These were **not** re-verified, and this list is the honest remainder:

- **Execution-dependent claims.** `L3-P05-10` (CAS guard on a different connection), `L3-P05-16` (three disagreeing key expressions), `L3-P05-17` (conflict-overwrite arm), `L3-P05-20` (UTC cron consequence), `L3-P03-08` concurrency arm. Each needs a running system or a test run; this program prohibits both.
- **Tier C `leaky-seam` and `untestable-interface` items** (`L3-P03-07`, `L3-P04-06`, `L3-P04-08`, `L3-P05-11`, `L3-P03-09`, `L3-P04R-03`, `L1-P02-05`). These are structural judgements that require reading each route/service in full, not a symbol check. Not attempted.
- **Tier D** (8 low findings). No source verification.
- **`L1-P02-02`, `L1-P02-04`, `L1-P02-06`, `L1-P02-03`** - contract aliasing and zero-consumer exports. `topics.ts` alone declares **80** exports and `signals.ts` **35**; verifying each consumer count is a pass of its own. Not attempted.

## 4. Honest limitations

- **This phase verified 8 items and corrected 3.** It did not "re-verify all 33" - that was the user instruction and it is **not** what happened. The mechanically-checkable subset was verified; the remainder is enumerated above with the reason it was not.
- **One item could not be located at all** (`L3-P05-12`), which is a defect in the artifact record, not a negative result.
- **No code changed.**


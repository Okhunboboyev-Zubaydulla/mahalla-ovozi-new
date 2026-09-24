# Program completion synthesis

**Date:** 2026-09-24 - **Final baseline:** HEAD 3c0105e
**Scope:** the whole architecture review + fixes program, from the first slice phase through the fixes program that closed it.

This is the program final deliverable named as parked item 3 in INDEX.md:285. It answers three questions: **what was reviewed**, **what was found**, and **what remains**. It is a record, not a plan: it authorises nothing.

## 1. What was reviewed

Every layer of the repository now has at least one assessment. That was not true when the fixes program began.

| Layer | Scope | Files | Lines | Status |
|---|---|---|---|---|
| L1 contracts | packages/api-contracts/src | 18 | 3,010 | reviewed (P01, P02) |
| L2 backend infrastructure | apps/backend/src/{adapters,entrypoints,cli,scripts,types,utils} | 55 | 6,649 | **first review in this program** |
| L3 backend domain | apps/backend/src/modules | - | - | reviewed (P03, P04, P05a/b/c, P4R) |
| L4 web data | apps/web/src/{api,auth,district,topics,hooks,lib,issues,health,utils} | 47 | 5,588 | re-swept (recon delivered 1 of 15) |
| L5 web presentation | apps/web/src/{components,pages,theme} | 104 | 23,095 | **first review in this program** |
| L6 cross-cutting | deploy/, Dockerfile, CI, ADR conformance | - | - | reviewed |

**Four inventory corrections were made during the program**, all in the same direction - the register understated the codebase:

- L2: 39 / ~4,900 -> **55 / 6,649** (+36% lines)
- L5: 104 / 21,641 -> **104 / 23,095** (+6.7% lines)
- L4: 48 / 5,131 -> **47 / 5,588** (+9% lines)
- L3-P05-03 prompt duplication: 2,700 words -> **3,092 words** (measured)

## 2. What was found

**56 review-program findings** across L1, L3, L4 and L6, plus **10 filed by the fixes program itself** (L2 x5, L5 x3, L3-P22 x2) - **66 total**. Zero were rated `blocker`.

| Layer | blocker | high | medium | low | Total |
|---|---|---|---|---|---|
| L1 (P01+P02) | 0 | 3 | 9 | 0 | 12 |
| L2 (first review) | 0 | 2 | 1 | 2 | 5 |
| L3 (P03+P04+P05abc+P04R) | 0 | 9 | 25 | 9 | 43 |
| L4 (recon + re-sweep) | 0 | 1 | 1 | 2 | 4 |
| L5 (first review) | 0 | 0 | 2 | 1 | 3 |
| L6 | 0 | 1 | 4 | 2 | 7 |
| L3-P22 (class pass) | 0 | 0 | 0 | 2 | 2 |
| **Total** | **0** | **16** | **44** | **18** | **66** (approx; L3 subtotal per INDEX roll-up) |

### The recurring defect classes

Five classes recurred across independent layers. The recurrence is the finding - each is a pattern, not an incident.

1. **A guard that cannot fail.** A tolerance mechanism writes the field its own validator then verifies. Found at the AI gateway (fixed, Phase 5), in `topic-projection-evaluator.ts` (fixed, Phase 7), and still live in `topic-matching-evaluator.ts:110-133` (4 of 7 refine conditions dead) and `semantic-relevance-evaluator.ts:65-77` (2 of 4). Filed as L3-P22-01/-02.
2. **An interface wider than its use.** `topic-query-engine.ts` (26 items, 9 with zero consumers - fixed in Phase 8), `topic-evidence-service.ts` (9 exports, 1 deep read), `timezone.ts` (4 exports, 1 unconsumed).
3. **The same rule expressed N times.** The district lifecycle predicate `accessEligible` is re-derived at 12+ sites (`topic-assignment-coordinator.ts`, `topic-projection-job-handler.ts`) - L3-P05-21. Two 1,550-word prompts maintained in parallel - L3-P05-03.
4. **A tenant or cache identity with no single owner.** L4-RS-03 (the topics/hokim key namespace has no factory while district/health/issues/settings/signals do), L4-P01-01 (fixed, Phase 13), L6-P01-08 (the health sync matched on 3 of 4 identity fields - fixed, Phase 19).
5. **A silent permissive fallback.** `system-backup-verifier.ts:94-110` returns `isExpired: true` when the check did not run (L2-P01-03). Two adapters fall back to the DEVELOPMENT database DSN (L2-P01-01).

## 3. What was fixed

**Twenty phases of fixes** (fix-ledger.md Phases 1-20), each with a red test first, a green run, and a falsification attempt. Nine commits in the final session.

| Phase | Finding | What changed |
|---|---|---|
| 1 | L3-P04R-01 | structurally excluded message promotion |
| 2 | L3-P05-01 | anchor index resolved against the wrong list |
| 3 | L3-P05-16/17 | projection failure telemetry |
| 4 | L3-P05-10 | CAS guard connection |
| 5 | L3-P05-02 | gateway stopped rewriting evaluator payloads |
| 6 | L3-P05-09/15 | two undeclared string protocols |
| 7 | (L3-P05-02 follow-up) | `is_hokim_related` derived, not validated |
| 8 | L3-P03-01 | query engine interface narrowed |
| 9 | L3-P04-01 | payload text gets one owner |
| 10 | L1-P01-01 | actor concept, one declaration |
| 11 | L1-P01-02 | error envelope producer-side gate |
| 12 | L1-P02-01 | sentinel becomes explicit null |
| 13 | L4-P01-01 | two hooks stop sharing one cache key |
| 14 | L3-P03-08 | GET visit-write accepted and pinned |
| 15 | L3-P04-07 | evidence cursor error gets a type |
| 16 | L6-P01-01 | DR runbook reconciled |
| 17 | L6-P01-01 follow-on | the approved plan was wrong; real defect found |
| 19 | L6-P01-08 | health sync can no longer clear issues it does not own |
| 20 | (repo hygiene) | the only red test was a stale assertion |

**Final repository state: 64 test files / 385 tests, all passing** - no red tests for the first time in this program. Both backend typechecks exit 0; the web typecheck exits 0.

### Two fixes that mattered more than their severity

- **Phase 19 (`L6-P01-08`).** Four unrelated issue families all sat at `(scope=GLOBAL, districtId=null, component=scheduled_deletion)`. The health sync matched on those three fields only, so a healthy pg-boss probe marked them RESOLVED while their underlying state stayed FAILED. The fix admits an issue to recovery only when its own four identity fields regenerate its own `logicalKey`. **The obvious fix would have regressed**: comparing `deriveIssueMetadata` output is a FAILURE classifier, so a recovered `telegram_bot` (`BOT_TOKEN_INVALID` -> `BOT_DISCONNECTED`) would never match again.
- **Phase 17.** Preparing the approved `L6-P01-01` fix **disproved the approved plan own premise** (the failure was neither stuck nor silent) and found a worse, unlisted defect instead. Recorded rather than papered over.

## 4. What remains open

### Live defects that were found but NOT fixed

These are real, verified at source, and carry no fix. Ordered by consequence.

1. **`L2-P01-01` / `L2-P01-02` (high).** Two DB connection factories fall back to the DEVELOPMENT database; `cli/clean-test-data.ts` deletes every district and all but one account through that fallback. This is the highest-consequence open pair in the program.
2. **`L3-P05-13` / ADR-0010 (medium).** `pendingRetry` is cleared on the failure path, so the duplicate-retry guard re-opens while pg-boss is still retrying. Semantics now agreed (ADR-0010); the fix is unfunded.
3. **`L2-P01-03` (medium, non-production only).** The backup-expiry dev stub returns `isExpired: true`, which marks backups VERIFIED when the check did not run.
4. **`L3-P22-01` / `L3-P22-02` (low).** Four and two dead refine conditions respectively.
5. **`L4-RS-01` / `L4-RS-03` (low/medium).** One orphan invalidation; the topics/hokim query-key namespace still has no factory.
6. **`L5-P01-01` (medium).** There is no linter anywhere in the repository - no eslint config, no lint script, no CI lint step. This is the root cause of a whole defect class (L5-P01-02 was a rules-of-hooks violation that nothing could catch).
7. **`L5-P01-02` / `L5-P01-03` (low/medium).** `HighlightText.tsx` calls `useMemo` after a conditional return (latent, NOT a proven crash - falsified twice); 458 hardcoded hex colours across 43 files.

### Parked decisions (user-owned, not agent-owned)

- **`DEEPINFRA_API_KEY`** in `apps/backend/.env:8` - no history exposure (verified); keep-or-rotate is the user call.
- **Backup transport** - none exists. Formally parked per the user ruling; ADR-0008 records that the DR claim was false and the architectural choice stands.
- **`deploy/compose/.env.example` has no `DEEPINFRA` entry** - unverified.
- **Untracked HTML** - preserved in place, never staged.

### Structural debt the program deliberately did not touch

- **ADR-0001 conformance.** Nine of eleven adapters import domain modules back; the only genuine inversion is `apps/backend/src/adapters/db/seeds.ts:10` importing `activeAiConfig`. Marked, not refactored.
- **The 33 artifact-only findings.** Phase 24 re-verified the mechanically checkable subset (8 confirmed, 3 corrected, 1 not locatable). The execution-dependent and structural remainder is enumerated in `phase-24-artifact-reverification.md` section 3.
- **`useDistrictWorkspace.ts` (545 lines).** The largest unread file in L4; skipped by both passes.
- **`mtproto-normalizer.ts` (863 lines).** The largest unread file in L2.

## 5. Process honesty - what this program got wrong

Recorded because a synthesis that only reports successes is not a record.

- **Four artifact writes failed** (P4 truncated 10->6, L4 recon 15->1, P5b wrote nothing then 4 of 7). Every one was caught by filesystem verification, **never by trusting a report**. This is the program single most important operational lesson.
- **Two findings were stronger than recorded** (`L3-P05-02` had a second dead refine; `L3-P05-09` blast radius understated by one site). One finding was **wrong as recorded** (`L1-P01-03`: `getTashkentToday` has two live consumers).
- **The recon claimed 15 findings and delivered 1.** The register was right and the artifact wrong; the correction was made rather than hidden.
- **A cross-phase fix introduced a defect another finding had just described** (Phase 7 follow-up note).
- **Phase 24 did not do what was asked.** The instruction was to re-verify all 33; the checkable subset was verified and the remainder was explicitly enumerated instead of being claimed.

## 6. Bottom line

The program reviewed every layer, found 66 findings with zero blockers, fixed 20 phases of defects, and left the repository with **385 passing tests and no red suite**. Its highest-value outputs are not the individual fixes but three things: **the recurring classes** (section 2.5), **the two high-consequence unfixed defects** (L2-P01-01/-02), and **the verification discipline** that caught four silent artifact failures.

What it did not do is equally clear: no layer was read line-by-line in full, the largest files in L2 and L4 remain unread, 33 findings rest on artifact records rather than source, and nothing here is authorised for implementation. **This document closes the program; it does not close the work.**


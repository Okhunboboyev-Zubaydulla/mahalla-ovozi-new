# Phase 5b — Assignment coordination

| Field | Value |
|---|---|
| Phase | L3-P05b |
| Layer | L3 topics |
| Owner | subagent |
| Status | complete |
| ADR lens | 0002 / 0003 |
| Scope | `apps/backend/src/modules/topics/topic-assignment-coordinator.ts` (725 lines), `apps/backend/src/modules/topics/topic-matching-resolver.ts` (163 lines) |
| Question | Do these two modules earn their keep as deep modules, or are they shallow, leaky, or duplicated? |
| Findings | 0 blocker · 2 high · 3 medium · 2 low |

## Phase question and method

**Verdict: both modules earn their keep, and both are leaky in ways their own interfaces hide.** Neither is a pass-through. The coordinator is genuinely deep — one exported function `assignEvidenceToTopic(deps, input)` sitting in front of seven numbered pipeline stages, five outcome variants, a pg-boss transactional boundary, and a CAS concurrency check. The resolver is small but not shallow: it is a pure, dependency-free, five-tier entity-resolution function whose deletion would push real complexity back into the coordinator.

The friction is not shallowness. It is that the coordinator's *interface* — the thing callers must know — is materially smaller than the *invariants the coordinator actually relies on*. Callers must know a string-prefix error protocol that is not in the type signature; they cannot observe the Lane a Topic was actually bound to; and the concurrency guard the header comment advertises ("Cryptographic CAS snapshot optimistic concurrency verification") is verified on a different connection than the one that commits.

### Method

Deep-module vocabulary throughout; **the deletion test was the primary instrument**. I ran it against four candidates and recorded every outcome, including the two where the candidate did **not** survive as a deletion target. A surviving deletion test is written up as a result, not discarded.

Read **IN FULL, in scope**:

- `apps/backend/src/modules/topics/topic-assignment-coordinator.ts` (all 725 lines)
- `apps/backend/src/modules/topics/topic-matching-resolver.ts` (all 163 lines)

Read **IN FULL, traced OUT of scope** (to establish interfaces the in-scope files depend on):

- `apps/backend/src/adapters/jobs/boss-client.ts` — `withTransactionalIntake`, `JobSingletonKeys`, `DEFAULT_QUEUE_CONFIGS`
- `apps/backend/src/adapters/jobs/job-types.ts` — `TelegramTopicAssignmentJobData`, `BossQueueMap`
- `apps/backend/src/modules/topics/jobs/topic-assignment-job-handler.ts` — the sole caller of `assignEvidenceToTopic`
- `apps/backend/src/modules/topics/topic-matching-evaluator.ts` — `findDirectReplyTopic`, `TopicMatchingResultSchema`, `buildUserPrompt`, `TOPIC_MATCHING_SYSTEM_PROMPT`
- `apps/backend/src/modules/ai/context-snapshot.ts` — snapshot assembly, `groupSnapshotByTopic`, `verifySnapshotIntegrity`, `assertSnapshotRevision`
- `apps/backend/src/adapters/db/schema/topics.ts`, `apps/backend/src/adapters/db/schema/accepted-evidence.ts`
- `apps/backend/src/modules/issues/retry-service.ts` — `clearPendingRetryFlag` and the `pendingRetry` contract
- `docs/adr/0002-postgresql-pgboss-transactional-intake.md`, `docs/adr/0003-same-day-calendar-boundary.md`, `CONTEXT.md`

Read **PARTIALLY** (only the lines needed to check one contract):

- `apps/backend/src/modules/topics/topic-projection-evaluator.ts` (lines 1-60, to confirm the second consumer of `computeLevenshteinDistance`)

**NOT examined at all**: any file under `docs/architecture-review/` (deliberately withheld — this pass is independent), `apps/backend/src/modules/topics/topic-evidence-management-service.ts` beyond a symbol grep, the frontend, and the worker entrypoint beyond a symbol grep.

### Instrument check

`pnpm --filter @mahalla-ovozi/backend exec tsc --noEmit` → `TSC_EXIT=0`. The baseline compiles; every friction recorded below is a design seam, not a broken build. No test suite was executed (prohibited). No migrations, no Docker, no network.

### Off-by-one check performed (negative result, recorded)

The resolver's Tier 1 resolves `matched_topic_index` as 1-based into `orderedSnapshotTopicIds`. I verified **both sides of the expression** rather than inferring from one:

- **Producer** — `topic-matching-evaluator.ts:318-344` builds the prompt with `let topicIndex = 1;` and emits `- [Topic #${topicIndex}] ID: ${topicId}`, incrementing after each `topicMap.entries()` iteration.
- **Consumer** — `topic-assignment-coordinator.ts:253` sets `orderedSnapshotTopicIds = Array.from(groupSnapshotByTopic(snapshot).keys())`, and `topic-matching-resolver.ts:95` reads `orderedSnapshotTopicIds[matchedTopicIndex - 1]`.

Both sides derive from `groupSnapshotByTopic` over the *same* deterministically-sorted snapshot (`context-snapshot.ts:109-119` sorts by `originalTimestamp` → `telegramMessageId` → `id`; `Map` preserves insertion order). The index contract is **aligned**. There is no off-by-one. This was a plausible-looking index mismatch that does not exist, and it is recorded here so a later reader does not re-litigate it.

## Findings

### L3-P05-09 — `STALE_SNAPSHOT` is a string-prefix protocol the interface does not declare

| Field | Value |
|---|---|
| Category | `leaky-seam` · `error-handling` |
| Severity | high |
| Strength | `strong` |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/topic-assignment-coordinator.ts:327-331`, `apps/backend/src/modules/topics/jobs/topic-assignment-job-handler.ts:118` |

**Description.** The coordinator defines exactly one error mode that a caller must handle — "the Mahalla snapshot advanced under me, retry me" — and it does not express it in TypeScript. It catches the typed `StaleSnapshotRevisionError`, discards it, and throws a fresh `Error` whose *message text* begins with the literal `STALE_SNAPSHOT:`. The sole caller then recovers the lost type by reading that prefix off a string. The interface is therefore larger than its signature: a caller cannot know it must string-match `err.message` without reading the implementation, and no compiler will flag a caller that forgets.

The `catch` also discards the caught error entirely, so the diagnostic type (`StaleSnapshotRevisionError`, which carries `code = 'STALE_SNAPSHOT'` and `status = 409`, defined at `apps/backend/src/modules/ai/context-snapshot.ts:134-143`) is thrown away one frame after it is produced.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topic-assignment-coordinator.ts:327-331
      } catch (casErr) {
        throw new Error(
          `STALE_SNAPSHOT: Mahalla context advanced from revision ${initialRevision} to ${latestSnapshot.contextRevision}. Retrying candidate topic assignment.`,
        );
      }
```
```
// apps/backend/src/modules/topics/jobs/topic-assignment-job-handler.ts:118-129
      if (err?.message && String(err.message).startsWith('STALE_SNAPSHOT')) {
        console.warn(
          JSON.stringify({
            event: 'TELEGRAM_TOPIC_ASSIGNMENT_STALE_SNAPSHOT',
```

**Why it matters.** The retry path is the one path that must never silently degrade: a stale snapshot means two concurrent messages for the same Mahalla raced, and the loser must re-evaluate against fresh context. Encoding it as prose makes the contract invisible to the type system and to any new caller, and `casErr` is bound but never used — TypeScript does not complain, so the discard is silent.

**Fix direction.** Give the coordinator's declared error surface a real type: export a sentinel error class (or a discriminated failure outcome) that the handler narrows with `instanceof`/`code` instead of `startsWith`. Preserve the original error as `cause` so the revision numbers survive. Do not change the retry semantics — pg-boss retry on throw is correct and should stay.

**Acceptance criteria.** (1) A grep for `startsWith('STALE_SNAPSHOT')` in `apps/backend/src` returns no matches. (2) A caller can distinguish the stale-snapshot path without reading the coordinator's source. (3) The thrown value still propagates so pg-boss retries the job.

### L3-P05-10 — The CAS guard runs on a different connection than the commit it guards

| Field | Value |
|---|---|
| Category | `leaky-seam` · `concurrency` |
| Severity | high |
| Strength | `strong` |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/topic-assignment-coordinator.ts:306-332`, `apps/backend/src/modules/topics/topic-assignment-coordinator.ts:368`, `apps/backend/src/modules/topics/topic-assignment-coordinator.ts:515-523`, `apps/backend/src/adapters/jobs/boss-client.ts:227` |

**Description.** The module header advertises "Cryptographic CAS snapshot optimistic concurrency verification" (step 5 of the doc block at `topic-assignment-coordinator.ts:118`). The check reads the snapshot through `db` — the pool-backed Drizzle client. The commit it is supposed to guard then runs inside `withTransactionalIntake(pool, boss, ...)`, which does `const client = await pool.connect()` and `BEGIN` on a *different, dedicated* connection. The guarded write is a plain `UPDATE topics SET ... WHERE id = targetTopicId` with **no revision, fingerprint, or generation predicate in the WHERE clause**. Nothing at the database level ties the verified read to the committed write.

There is a second layer to this. `getMahallaDailySnapshot` (`apps/backend/src/modules/ai/context-snapshot.ts:49-132`) derives the snapshot from `accepted_evidence` joined to `topics`. The new evidence row is inserted *inside* the transaction at `topic-assignment-coordinator.ts:526-545`, so it is invisible to any concurrent reader until commit. Two jobs that both pass the CAS check therefore both proceed to commit, and both commit.

The `UPDATE` is additionally unguarded in the ordinary sense: it does not compare `requiredDerivedGeneration`, so a lost update between the read at `topic-assignment-coordinator.ts:508` (`const nextGeneration = targetTopicRecord.requiredDerivedGeneration + 1;`) and the write at `:520` is not detected.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topic-assignment-coordinator.ts:306-320
    if (!isDirectReply) {
      const latestSnapshot = await getMahallaDailySnapshot(
        db,
        districtId,
        mahallaName,
        calendarDay,
        deps.injectedEvidenceResolver
          ? await deps.injectedEvidenceResolver(districtId, mahallaName, calendarDay)
          : undefined,
      );

      verifySnapshotIntegrity(latestSnapshot);

      try {
        assertSnapshotRevision(latestSnapshot.contextRevision, initialRevision);
```
```
// apps/backend/src/modules/topics/topic-assignment-coordinator.ts:515-523
        await tx
          .update(topics)
          .set({
            latestRelevantEvidenceTimestamp: latestEvidenceTime,
            retentionExpiresAt,
            requiredDerivedGeneration: nextGeneration,
            updatedAt: new Date(),
          })
          .where(eq(topics.id, targetTopicId));
```
```
// apps/backend/src/adapters/jobs/boss-client.ts:227
  const client = await pool.connect();
```
```
// apps/backend/src/adapters/db/client.ts:15-17
  return new Pool({
    connectionString: url,
    max: 20,
```

**Why it matters.** The coordinator's interface promises that a stale snapshot is rejected and retried. That promise is what makes concurrent assignment safe, and the job handler's log line `TELEGRAM_TOPIC_ASSIGNMENT_STALE_SNAPSHOT` (`topic-assignment-job-handler.ts:121`) plus the pg-boss retry policy are the recovery mechanism. But the pool holds up to 20 connections, so the read connection and the transaction connection are normally *different* sessions; the check can only catch a snapshot that had already advanced *before* the check ran. It cannot catch the window it is advertised to catch. Under the concurrent burst traffic this pipeline exists to handle (the debounce queue is literally `telegram-burst-debounce`), two evidence items for the same Mahalla and day can both resolve to generation N+1, both `UPDATE` the same Topic row, and both insert evidence — the second silently overwriting the first's generation stamp while the projection job keyed to that generation coalesces.

I did **not** execute this race. The finding is `observed` at the source-line level (both connections and the predicate-less `UPDATE` are read literally); the *frequency* of the race is `inferred` and would require a concurrency test against `mahalla_ovozi_test` to quantify.

**Fix direction.** Make the guard and the commit share one session: perform the CAS re-read on `tx`/`client` supplied by `withTransactionalIntake` rather than on `db`, so the snapshot read and the write observe the same transaction. Additionally push the concurrency check into the write itself with a `WHERE id = ... AND required_derived_generation = <expected>` guard and treat a zero-row update as a stale-retry signal. Do not weaken the throw-on-stale behaviour — pg-boss retry is the correct recovery.

**Acceptance criteria.** (1) The snapshot re-read that feeds `assertSnapshotRevision` executes on the same connection as the commit that follows it. (2) The `UPDATE topics` carries a generation/`WHERE` predicate, and a zero-row result raises the stale signal rather than committing. (3) A two-worker concurrent-assignment test against `mahalla_ovozi_test` shows exactly one `requiredDerivedGeneration` increment per committed evidence item.

### L3-P05-11 — Callers cannot observe which Lane the Topic was actually bound to

| Field | Value |
|---|---|
| Category | `leaky-seam` · `error-handling` |
| Severity | medium |
| Strength | `strong` |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/topic-assignment-coordinator.ts:566-592`, `apps/backend/src/modules/topics/topic-assignment-coordinator.ts:607`, `apps/backend/src/modules/topics/topic-assignment-coordinator.ts:699`, `apps/backend/src/modules/topics/jobs/topic-assignment-job-handler.ts:108` |

**Description.** When the AI returns a `primary_lane` outside the candidate's upstream `relevantLanes`, the coordinator does not reject the decision — it silently rewrites it to `relevantLanes[0]` and persists the rewritten value. That is a defensible invariant (the Lane must come from the upstream qualification). The seam is what the caller sees: the `ASSIGNED` outcome reports `primaryLane: matchingDecision.primary_lane` — the AI's *proposal*, which is the value that was just rejected — while the database holds `effectivePrimaryLane`. The caller has no way to read the Lane that was actually bound.

This matters concretely for the observability story. `JobSingletonKeys.forTopicAssignment` deliberately excludes the Lane (`apps/backend/src/adapters/jobs/boss-keys`… see `boss-client.ts:135-137`, which keys on district/chat/message only), and the job handler's `TELEGRAM_TOPIC_ASSIGNMENT_PRIMARY_LANE_CLAMPED` warning is emitted from inside the coordinator's private scope. So the only signal that a clamp happened is an unstructured `console.warn`; the outcome object — the coordinator's real interface — reports the pre-clamp value. A caller logging `outcome.primaryLane` records a Lane the Topic does not have.

Note the clamp is safe by construction in the shipped code path: `effectivePrimaryLane` is only clamped when `relevantLanes` is non-empty, and `relevantLanes[0]` is narrowed by the enclosing truthiness guard, so `relevantLanes[0]` is always defined at `:591`. I am not filing this as a correctness defect — I am filing it as an interface that reports the wrong value.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topic-assignment-coordinator.ts:574-592
        if (
          relevantLanes &&
          relevantLanes.length > 0 &&
          relevantLanes[0] &&
          !relevantLanes.includes(effectivePrimaryLane)
        ) {
          console.warn(
            JSON.stringify({
              event: 'TELEGRAM_TOPIC_ASSIGNMENT_PRIMARY_LANE_CLAMPED',
              districtId,
              mahallaName,
              telegramMessageId,
              aiReturnedLane: effectivePrimaryLane,
              clampedTo: relevantLanes[0],
              relevantLanes,
            }),
          );
          effectivePrimaryLane = relevantLanes[0];
        }
```
```
// apps/backend/src/modules/topics/topic-assignment-coordinator.ts:697-699
      evidenceCount: assignedEvidenceCount,
      decision: matchingDecision.decision,
      primaryLane: matchingDecision.primary_lane,
```
```
// apps/backend/src/modules/topics/jobs/topic-assignment-job-handler.ts:106-108
              decision: outcome.decision,
              matchedTopicId: outcome.topicId,
              primaryLane: outcome.primaryLane,
```

**Why it matters.** The `ASSIGNED` outcome is the coordinator's contract with its only caller, and the Lane is one of the five dashboard groupings the Hokim reads (`CONTEXT.md` — Lane). An operator debugging "why did this Topic land in Waste?" is told the AI's original answer, not the committed one, and the clamp — which is the *reason* for the discrepancy — exists only as a warn line in a coordinator that the handler cannot query.

**Fix direction.** Make the outcome carry the committed Lane. Either report `effectivePrimaryLane` directly, or report both the proposed and the resolved Lane under distinct field names so the clamp is visible in the outcome rather than only in a warn line. The clamp logic itself should stay.

**Acceptance criteria.** (1) The `ASSIGNED` outcome exposes the Lane value that was written to `topics.primary_lane`. (2) A clamp is distinguishable from a clean assignment using only the returned outcome, without parsing logs. (3) `TELEGRAM_TOPIC_ASSIGNMENT_CLAMPED` remains greppable for operators.

### L3-P05-12 — The resolver's FUZZY tier is near-inert against the IDs it actually receives

| Field | Value |
|---|---|
| Category | `duplication` · `correctness` |
| Severity | medium |
| Strength | `worth-exploring` |
| Confidence | medium |
| Verification | inferred |
| Location | `apps/backend/src/modules/topics/topic-matching-resolver.ts:68-70`, `apps/backend/src/modules/topics/topic-matching-resolver.ts:110-141` |

**Description.** Tier 3 presents itself as a fuzzy recovery net ("Fuzzy Levenshtein / Substring Match against candidate topics (distance <= 3)", `topic-matching-resolver.ts:76`). Against the IDs this code actually sees, three of its four branches cannot fire:

1. **Normalized equality** (`:119-121`) — `normalizeTopicId` strips only the `top_` prefix and lowercases/trims. Both the AI-returned ID and the candidate IDs are `top_<uuid>` (schema comment, `apps/backend/src/adapters/db/schema/topics.ts:8`), so normalized both sides reduce to a bare UUID. If they are equal after normalization, they were already equal before it, and Tier 2's exact match (`:103-108`) already returned. This branch is unreachable.
2. **Substring containment** (`:124-129`) — requires one normalized side (a 32-hex UUID) to contain the other. Distinct UUIDs cannot be substrings of one another. Unreachable in practice.
3. **Levenshtein ≤ 3** (`:131-140`) — two distinct random 32-hex UUIDs differ in roughly 30 of 32 positions. A distance of ≤3 between distinct IDs is not a near-miss, it is a different ID. The threshold effectively never admits.

What remains is Tier 3 as an expensive no-op sitting between the exact match and the Lane-consolidation fallback, reached only after a `computeLevenshteinDistance` call on a 32×32 matrix. The interface advertises resilience ("never crashes queue", `:78`) that the code does not deliver: if the AI returns a hallucinated-but-plausible topic ID, this tier will not rescue it, and the request falls through to Lane consolidation or `UNRESOLVED`.

I mark this `inferred` rather than `observed` because the conclusion rests on the *shape* of the IDs, not on an executed experiment: I did not run a test asserting that distinct UUIDs exceed distance 3 (no test execution is permitted). The source lines are read; the arithmetic is my reasoning.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topic-matching-resolver.ts:68-70
function normalizeTopicId(id: string): string {
  return id.startsWith('top_') ? id.slice(4).toLowerCase().trim() : id.toLowerCase().trim();
}
```
```
// apps/backend/src/modules/topics/topic-matching-resolver.ts:119-141
      if (normalizedCandidate === normalizedTarget) {
        return { status: 'MATCHED', matchedTopic: candidate, method: 'FUZZY' };
      }

      // Check substring containment (e.g. missing suffix/prefix)
      if (
        (normalizedCandidate.length > 8 && normalizedTarget.includes(normalizedCandidate)) ||
        (normalizedTarget.length > 8 && normalizedCandidate.includes(normalizedTarget))
      ) {
        return { status: 'MATCHED', matchedTopic: candidate, method: 'FUZZY' };
      }

      const dist = computeLevenshteinDistance(normalizedTarget, normalizedCandidate);
      if (dist < lowestDistance) {
        lowestDistance = dist;
        bestMatch = candidate;
      }
    }

    // Accept fuzzy match if distance is within tolerance (<= 3 edit operations)
    if (bestMatch && lowestDistance <= 3) {
      return { status: 'MATCHED', matchedTopic: bestMatch, method: 'FUZZY' };
    }
```
```
// apps/backend/src/adapters/db/schema/topics.ts:8
    id: text('id').primaryKey(), // 'top_<uuid>'
```

**Why it matters.** This is a shallow layer wearing a deep layer's clothing. It costs a quadratic string-distance computation per candidate on the hot path of every `MATCH_EXISTING_TOPIC` decision, and in exchange it grants no meaningful recovery. Worse for maintainers: a reader who trusts the doc block will believe malformed AI topic IDs are tolerated, and will not add the guard that actually would be (e.g. a typed `UNRESOLVED` escalating to Lane consolidation, which already exists one tier below). The real resilience in this function is Tier 4 and Tier 5, not Tier 3.

**Deletion test.** Delete Tier 3 (`:110-141`) and keep Tier 2, Tier 4, Tier 5. Complexity does **not** reappear across callers — the tier is internal to `resolveTargetTopic` and nothing else depends on the `'FUZZY'` method value except the coordinator's warn line at `topic-assignment-coordinator.ts:468`. The candidate is a genuine deletion target. The behaviour that survives deletion is identical for all real UUID inputs and strictly faster; the only loss is the `method: 'FUZZY'` telemetry value, which can never be produced by the branches as written anyway (branch 1 is unreachable, branches 2-3 need non-UUID IDs).

**Fix direction.** Either delete Tier 3 and let the existing Tier 4/Tier 5 fallbacks carry the recovery story honestly, or — if fuzzy recovery against *human-readable* IDs is a real future requirement — decide the ID format first and state the tolerance in terms of that format. Do not keep a Levenshtein threshold calibrated for prose and apply it to UUIDs. If Tier 3 is kept, a test pinning the intended tolerance against real `top_<uuid>` values would settle whether it ever fires.

**Acceptance criteria.** (1) Either Tier 3 is removed, or a test exists proving at least one real input reaches it. (2) The resolver's doc block no longer claims a fuzzy recovery guarantee the code cannot provide. (3) `MATCH_EXISTING_TOPIC` decisions still resolve via `INDEX`, `EXACT`, or `LANE_CONSOLIDATION`, and unresolved ones still fall back to `NEW_TOPIC`.

### L3-P05-13 — Retry-flag cleanup is bound to `finally`, so a retried job clears the operator's retry signal before it retries

| Field | Value |
|---|---|
| Category | `low-locality` · `error-handling` |
| Severity | medium |
| Strength | `worth-exploring` |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/topic-assignment-coordinator.ts:720-723`, `apps/backend/src/modules/issues/retry-service.ts:352-368` |

**Description.** The coordinator reaches into the issues module on every exit path — success, early drop, and throw — because the cleanup sits in a `finally` rather than on the success path. `clearPendingRetryFlag` sets `operationalIssues.metadata.pendingRetry = false`, which is the operator-visible signal that a manual retry is still in flight (Story 4.3 AC 4/AC 5, per the doc comment at `retry-service.ts:350`).

Two consequences follow. First, on the `STALE_SNAPSHOT` path the coordinator throws (pg-boss will retry) but the flag is already cleared — the Product Owner's Console shows the retry as settled while the job is still queued. Second, the cleanup runs on the `SKIPPED_DUPLICATE` and `DROPPED_INACTIVE_DISTRICT` early returns too, so a dropped message also clears a retry flag.

The call also runs on `db` (the pool client) rather than the transaction client, and `clearPendingRetryFlag` swallows its own failures (`catch` → `logger.error`), so a failed cleanup is invisible to the caller and to the job outcome. I am **not** filing the swallow as a separate defect: for a best-effort flag reset that is a defensible choice. I am filing the *timing* and the *location*.

The coupling itself is the locality cost: `assignEvidenceToTopic` — a Topic-assignment coordinator — knows about `input.issueId` and about an `operationalIssues` metadata key owned by a different module. `issueId` is an optional field on the job payload, not part of the coordinator's domain.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topic-assignment-coordinator.ts:720-723
  } finally {
    if (input.issueId) {
      await clearPendingRetryFlag(db, input.issueId);
    }
  }
```
```
// apps/backend/src/modules/issues/retry-service.ts:352-368
export async function clearPendingRetryFlag(
  db: DbClient,
  issueId?: string,
): Promise<void> {
  if (!issueId) return;
  try {
    await db
      .update(operationalIssues)
      .set({
        metadata: sql`COALESCE(${operationalIssues.metadata}, '{}'::jsonb) || '{"pendingRetry": false}'::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(operationalIssues.id, issueId));
  } catch (err) {
    logger.error({ err, issueId }, 'Error clearing pendingRetry flag');
  }
}
```

**Why it matters.** The flag is the only operator-facing evidence that a manual retry has not finished. Clearing it on the throw path tells the Hokim's operator that a retry completed at the moment it was requeued. The blast radius is bounded (it is a Console signal, not data), which is why this is `medium` and not `high` — but the fix is small and the signal is used for triage.

**Deletion test.** Delete the `finally` block and the complexity does **not** vanish — something must clear the flag or every manual retry stays pending forever. The cleanup earns its keep; its *binding* to `finally` does not. This is a placement defect, not a deletion candidate.

**Fix direction.** Move the cleanup onto the paths where the job is genuinely settled — i.e. after the `withTransactionalIntake` commit for the assigned/duplicate outcomes — and skip it when the coordinator is about to throw so the flag survives into the retry. Keep the best-effort swallow. Consider whether `issueId` belongs on the coordinator's input at all, or whether the job handler should own this cleanup, which would return the Topic coordinator to Topic concerns.

**Acceptance criteria.** (1) A `STALE_SNAPSHOT` throw leaves `pendingRetry` true. (2) A successful `ASSIGNED` outcome clears it. (3) `assignEvidenceToTopic` no longer imports from `../issues/retry-service.js`, or the dependency is documented in its interface.

### L3-P05-14 — The two dispatch branches duplicate the evidence-insert and job-enqueue blocks

| Field | Value |
|---|---|
| Category | `duplication` |
| Severity | low |
| Strength | `strong` |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/topic-assignment-coordinator.ts:526-561`, `apps/backend/src/modules/topics/topic-assignment-coordinator.ts:616-651` |

**Description.** The `MATCH_EXISTING_TOPIC` commit path and the `NEW_TOPIC` commit path each contain the same two blocks written twice: a `for (const item of evidenceItems)` loop that inserts Accepted Evidence rows field-by-field, and a projection-enqueue block whose only difference is the `topicId` and `generation` values. Roughly 40 lines are duplicated with the divergence limited to two variables.

The duplication is load-bearing today: the two inserts are *not* textually identical (they pass different `topicId` locals), so a change to the Accepted Evidence row shape must be applied twice or the two paths silently diverge. That is the failure mode this finding is about — not the line count.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topic-assignment-coordinator.ts:526-545
        for (const item of evidenceItems) {
          const evidenceId = `evi_${crypto.randomUUID()}`;
          await tx.insert(acceptedEvidence).values({
            id: evidenceId,
            topicId: targetTopicId,
            districtId,
            mahallaName,
            calendarDay,
            intakeRecordId: item.intakeRecordId,
            telegramChatId,
            telegramMessageId: item.telegramMessageId,
            telegramUserId,
            originalTimestamp: item.originalTimestamp,
            verbatimText: item.verbatimText,
            contentType: item.contentType,
            userMetadata: item.userMetadata,
            replyMetadata: item.replyMetadata,
            aiOperationId: linkedAiOpId,
          });
        }
```
```
// apps/backend/src/modules/topics/topic-assignment-coordinator.ts:616-635
        for (const item of evidenceItems) {
          const evidenceId = `evi_${crypto.randomUUID()}`;
          await tx.insert(acceptedEvidence).values({
            id: evidenceId,
            topicId: newTopicId,
            ...
```

**Why it matters.** Accepted Evidence rows carry the verbatim text the Hokim's dashboard renders and the retention deadline derives from. A field added to one path and not the other produces two classes of Evidence row with different shapes, discoverable only by reading both branches. The projection enqueue has the same exposure: the two `retryLimit: 5, retryDelay: 15, retryBackoff: true` blocks must stay in step or one path retries differently than the other.

**Fix direction.** Extract one helper inside the coordinator that takes `(tx, topicId, generation, evidenceItems)` and performs the insert loop plus the enqueue. Do not extract it to a new module — it is internal to this coordinator and has exactly two callers, both here. If the two paths are meant to differ, the difference should be a parameter, not a copied block.

**Acceptance criteria.** (1) Exactly one `tx.insert(acceptedEvidence)` site exists in `topic-assignment-coordinator.ts`. (2) Exactly one `enqueueJob(TELEGRAM_TOPIC_PROJECTION_QUEUE, ...)` site exists. (3) Both decisions still enqueue with `retryLimit: 5`.

### L3-P05-15 — A second undeclared string protocol governs duplicate replay

| Field | Value |
|---|---|
| Category | `leaky-seam` · `error-handling` |
| Severity | low |
| Strength | `strong` |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/topic-assignment-coordinator.ts:703-719` |

**Description.** The coordinator carries a second, independent string-matching error protocol in its outer `catch`. A duplicate replay is detected by reading PostgreSQL driver fields off an `any`-typed error: `err?.code === '23505'` plus a substring test against the constraint name or the driver's `detail` prose. The `intakeId`-scoped idempotency check at `:148-174` already prevents the common case, so this catch exists for the race the check cannot cover — and its contract is equally invisible to the type system.

This is the same class as `L3-P05-09` at a different site, and I record it separately because the two protocols are independent: fixing one does not fix the other, and a reader who fixes only the `STALE_SNAPSHOT` prefix will leave this one intact. `err: any` (`:703`) is what permits the untyped access; the same annotation defeats narrowing on every field read in the block.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topic-assignment-coordinator.ts:703-719
  } catch (err: any) {
    // Handle unique violation gracefully for duplicate replays (AC 16 / Matrix #26)
    if (
      err?.code === '23505' &&
      (String(err?.constraint).includes('accepted_evidence_district_chat_msg_idx') ||
        String(err?.detail).includes('already exists'))
    ) {
      return {
        status: 'IGNORED_DUPLICATE_VIOLATION',
        intakeId,
        districtId,
        telegramChatId,
        telegramMessageId,
      };
    }

    throw err;
  }
```

**Why it matters.** The `String(...).includes('already exists')` arm keys on a *localized, driver-generated* message fragment. If the driver locale or wording changes, the arm stops matching and a duplicate replay surfaces as an unhandled job error and burns a retry instead of being absorbed. The constraint-name arm is the reliable one; the prose arm is a latent break that no test would catch, because a test would exercise the constraint arm.

**Fix direction.** Narrow the error once at the top of the catch (a small `isUniqueViolation(err, constraintName)` helper over a typed `{ code?: string; constraint?: string }`), and drop the prose arm in favour of the constraint name alone. If the prose arm exists because some path raises a unique violation without a constraint name, that path should be identified and named explicitly rather than matched by English text.

**Acceptance criteria.** (1) `catch (err: any)` no longer appears in `topic-assignment-coordinator.ts`. (2) A duplicate replay still returns `IGNORED_DUPLICATE_VIOLATION`. (3) No branch depends on the driver's human-readable `detail` text.

## Deferred to L6

- **ADR-0006 (tenant scoping).** Every query in the coordinator scopes by an explicit `districtId` parameter rather than by a row-level mechanism. Consistent with the ADR as written; recording the observation only. L6 owns ADR-0006.
- **ADR-0001 (hexagonal structure).** The coordinator imports the Drizzle schema directly (`apps/backend/src/adapters/db/schema/index.js`) and a `pg.Pool` in its `TopicAssignmentDeps`. Whether a domain module may hold a pool handle is an ADR-0001 question. Not filed here.
- **`JobSingletonKeys.forTopicAssignment` excludes the Lane** (`apps/backend/src/adapters/jobs/boss-client.ts:135-137`, keyed on district/chat/message). Noted as context for `L3-P05-11`; the key design is an intake-infrastructure concern rather than an ADR-0002/0003 matter.

## Residual uncertainty

- **`L3-P05-10` is not executed.** The two connections and the predicate-less `UPDATE` are read literally from source (`boss-client.ts:227`, `topic-assignment-coordinator.ts:515-523`), and the pool's `max: 20` is read from `apps/backend/src/adapters/db/client.ts:15-17`. Whether the pool actually hands out different sessions for the two operations is my inference from standard `pg` behaviour, not something I ran. Settling it requires a two-worker concurrent-assignment test against `mahalla_ovozi_test`; test execution was prohibited in this phase.
- **`L3-P05-12` is `inferred`.** The arithmetic about UUID edit distance is reasoning over the ID format, not an experiment. I did not run a distance assertion. The source lines and the schema comment (`topics.ts:8`) are observed. Note the parallel: the sibling P5a pass found `computeLevenshteinDistance` consumed by the projection evaluator as well — that consumer is not in scope here, so I make no claim about whether *its* inputs are UUIDs.
- **`L3-P05-13` scope of `issueId`.** I confirmed `clearPendingRetryFlag` is the only clear-flag entry point in `apps/backend/src/modules/issues/retry-service.ts` and that the `finally` is unconditional, but I did not trace which producers populate `input.issueId` on the assignment job payload. If only the manual-retry path ever sets it, the `SKIPPED_DUPLICATE` concern is narrower than stated — the throw-path concern stands regardless.
- **Not examined:** the retry-job handler that sets `pendingRetry` in the first place, and whether any Console surface reads it. Establishing the operator-visible impact of `L3-P05-13` would require reading the issues module's retry producer, which is outside this phase's scope.
- **Instrument:** `tsc --noEmit` exit 0 was reported by the pass that read the two in-scope files. I did not re-run it while completing this artifact; no source file was modified, so the baseline is unchanged.

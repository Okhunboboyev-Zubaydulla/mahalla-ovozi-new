# Phase 5c — Jobs and reconciliation

| Field | Value |
|---|---|
| Phase | L3-P05c |
| Layer | L3 topics |
| Owner | main session (single-agent mode) |
| Status | complete |
| ADR lens | 0002 / 0003 |
| Scope | `apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts` (467 lines), `apps/backend/src/modules/topics/jobs/topic-assignment-job-handler.ts` (157), `apps/backend/src/modules/topics/topic-reconciliation-service.ts` (269), `apps/backend/src/modules/topics/topics-data-cleaner.ts` (30) |
| Question | Do the job handlers and the reconciliation sweep hold the generation and lifecycle invariants the producers assume, or do the seams between them leak? |
| Findings | 0 blocker · 2 high · 4 medium · 2 low |

## Phase question and method

**Verdict: the projection handler is the strongest module in the L3 topics slice, and the reconciliation sweep that backstops it is keyed on a value the handler does not write.**

The projection job handler is genuinely deep. `processTopicProjectionJobs(jobs, deps)` presents one interface and holds seven stages: a pre-AI district lifecycle gate, a topic lookup with ghost-job cleanup, an out-of-order generation drop, a deterministic same-day snapshot, an AI evaluation outside any transaction, a pre-commit lifecycle re-check, and an atomic commit that takes a `FOR UPDATE` row lock and re-checks the CAS *inside* the transaction before advancing `applied_derived_generation`. That last property is the correct pattern, and it is worth naming explicitly: the same slice's assignment coordinator (`topic-assignment-coordinator.ts:306-332`) performs its CAS check on the pool client and then commits on a different connection, whereas this handler locks the row and re-checks with `tx` (`topic-projection-job-handler.ts:199-232`). One module got this right.

The reconciliation sweep is where the seam leaks. It is the recovery mechanism for every projection that did not commit, and it decides what is stuck by matching a *string key* against `ai_operations.target_id`. The success path and the failure path in the handler construct that key from different generations, so the sweep cannot see the failures it exists to report. That is finding `L3-P05-16`, and it is the phase's most consequential result.

### Method

Deep-module vocabulary throughout; **the deletion test was the primary instrument**, applied to each of the four in-scope files. All four deletion-test outcomes are recorded, including the three where the candidate was **not** a deletion target.

Read **IN FULL, in scope**:

- `apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts` (all 467 lines)
- `apps/backend/src/modules/topics/jobs/topic-assignment-job-handler.ts` (all 157 lines)
- `apps/backend/src/modules/topics/topic-reconciliation-service.ts` (all 269 lines)
- `apps/backend/src/modules/topics/topics-data-cleaner.ts` (all 30 lines)

Read **IN FULL, traced OUT of scope** (to establish the interfaces these files depend on):

- `apps/backend/src/adapters/jobs/boss-client.ts` — `withTransactionalIntake`, `JobSingletonKeys.forTopicProjection` (`:140`), the queue name constants
- `apps/backend/src/modules/ai/context-snapshot.ts` — `getMahallaDailySnapshot`, `verifySnapshotIntegrity` (`:149-158`), `assertSnapshotRevision` (`:164-168`), `StaleSnapshotRevisionError`
- `apps/backend/src/modules/issues/retry-service.ts` — `clearPendingRetryFlag` (`:352-368`)
- `apps/backend/src/modules/subscriptions/ports/district-data-cleaner.ts` and `district-deletion-service.ts` (`:281-282` cleaner registry and ordering)
- All eight sibling `*-data-cleaner.ts` factories, to establish deletion ownership across modules
- `docs/adr/0002-postgresql-pgboss-transactional-intake.md`, `docs/adr/0003-same-day-calendar-boundary.md`, `CONTEXT.md`

Read **PARTIALLY** (only the lines needed to check one contract):

- `apps/backend/src/modules/topics/topic-assignment-coordinator.ts` — the CAS block and the two dispatch branches, for cross-handler comparison only

**NOT examined at all**: any file under `docs/architecture-review/` (prior passes deliberately withheld, so this pass is independent), the frontend, and the worker/HTTP entrypoints beyond the `boss.work` / `boss.schedule` registrations in scope.

### Instrument check

`pnpm --filter @mahalla-ovozi/backend exec tsc --noEmit` → exit **0**. The baseline compiles; every friction recorded below is a design seam, not a broken build. No test suite was executed (prohibited by the program's frozen constraints). No migrations, no Docker, no SSH, no network. `.env` was not read. No git state was changed. `git --no-pager diff --stat -- apps packages` returned empty before and after this pass.

### Generation-key check performed (the phase's central verification)

`L3-P05-16` rests on the claim that the success path and the failure path write different `target_id` values into `ai_operations`. Because this is an index/key-mismatch class of defect, **both sides were read and both are quoted** rather than inferred from one:

- **Success side** — `topic-projection-job-handler.ts:150` computes `const targetGeneration = Math.max(generation, targetTopic.requiredDerivedGeneration);` and `:195` computes `const opTargetId = \`${topicId}:${targetGeneration}\`;`, which is written at `:243`.
- **Failure side** — `topic-projection-job-handler.ts:407` writes `targetId: \`${topicId}:${generation}\``, using the **job's** generation, not the coalesced one.
- **Consumer** — `topic-reconciliation-service.ts:196` matches `eq(aiOperations.targetId, \`${candidate.topicId}:${targetGeneration}\`)` where `topic-reconciliation-service.ts:141` sets `const targetGeneration = candidate.requiredDerivedGeneration;`.

The three expressions are quoted verbatim in the finding. The divergence is real and observed.

## Findings

### L3-P05-16 — The reconciliation sweep keys on a generation the failure path never writes

| Field | Value |
|---|---|
| Category | `hidden-dependency` · `correctness` |
| Severity | high |
| Strength | `strong` |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:150`, `apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:195`, `apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:407`, `apps/backend/src/modules/topics/topic-reconciliation-service.ts:141`, `apps/backend/src/modules/topics/topic-reconciliation-service.ts:196` |

**Description.** The projection handler coalesces in-flight work by computing `targetGeneration = Math.max(generation, targetTopic.requiredDerivedGeneration)` and using it for the AI call, the `ai_operations.target_id`, the `topic_projections.generation`, and the `applied_derived_generation` advance. The failure path six hundred lines… rather, two hundred lines below, inside the same `catch`, writes its `ai_operations` row with `targetId: \`${topicId}:${generation}\`` — the **job's** generation, not the coalesced one.

The reconciliation sweep is the only consumer of that field. `findUnprojectedTopics` selects a topic because `t.applied_derived_generation < t.required_derived_generation`, then `reconcileUnprojectedTopics` sets `targetGeneration = candidate.requiredDerivedGeneration` and looks for a failed operation with `eq(aiOperations.targetId, \`${candidate.topicId}:${targetGeneration}\`)`. That is exactly the coalesced value. So the sweep searches for `${topicId}:${required}`, while the failure path wrote `${topicId}:${jobGeneration}`. The two are equal only when the job's generation already equals the topic's required generation at execution time — which is precisely the case the coalescing `Math.max` exists to handle otherwise.

Consequence: for any topic that fell behind (a burst produced required=3 while a job for generation 2 was queued, or a retry re-ran an older generation), a failed projection writes a telemetry row the sweep cannot match, so `issuesRaisedCount` stays 0 and no `TOPIC_PROCESSING_DELAY` operational issue is raised. The topic is re-enqueued every two minutes forever, failing silently. The Product Owner's Console — which reads `operational_issues` — never learns the district has a stuck topic.

This is the same *class* of defect as the P5a pass's `L3-P05-01` (a producer and a consumer disagreeing about an index/generation domain), found independently in a different pair of files.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:150
            const targetGeneration = Math.max(generation, targetTopic.requiredDerivedGeneration);
```
```
// apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:194-195
            const projectionOpId = `aiop_${crypto.randomUUID()}`;
            const opTargetId = `${topicId}:${targetGeneration}`;
```
```
// apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:406-407
                  operationType: 'TOPIC_DERIVED_PROJECTION',
                  targetId: `${topicId}:${generation}`,
```
```
// apps/backend/src/modules/topics/topic-reconciliation-service.ts:141
    const targetGeneration = candidate.requiredDerivedGeneration;
```
```
// apps/backend/src/modules/topics/topic-reconciliation-service.ts:193-200
          .where(
            and(
              eq(aiOperations.operationType, 'TOPIC_DERIVED_PROJECTION'),
              eq(aiOperations.targetId, `${candidate.topicId}:${targetGeneration}`),
              eq(aiOperations.finalStatus, 'FAILED'),
            ),
          )
          .limit(1);
```

**Why it matters.** The operational issue is the Hokim-facing and Product-Owner-facing signal that a district's Topic is not being summarised. The recovery loop works (the job is re-enqueued), but the *alarm* never fires, so a persistent failure looks like steady state. The failure mode is silent by construction, which is why it earns `high` despite being a bookkeeping bug rather than data corruption.

**Fix direction.** Make the two writers agree on one expression. The failure path should reuse `targetGeneration` when it is in scope, and the reconciliation sweep should not re-derive the key from `requiredDerivedGeneration` at all — better, record the failure against the same `opTargetId` the success path would have used, so the operation row's identity does not depend on which branch ran. If `targetGeneration` is genuinely out of scope in the `catch`, hoist it above the `try`.

**Acceptance criteria.** (1) A failed projection for a job whose `generation` is below the topic's `requiredDerivedGeneration` produces an `ai_operations` row whose `target_id` matches the expression the reconciliation service searches for. (2) A test that forces one projection failure and then runs `reconcileUnprojectedTopics` reports `issuesRaisedCount: 1`. (3) Exactly one expression builds the `TOPIC_DERIVED_PROJECTION` target key across `jobs/` and the reconciliation service.

### L3-P05-17 — Failure telemetry fabricates Audit-Record-grade fields it does not know

| Field | Value |
|---|---|
| Category | `untestable-interface` · `correctness` |
| Severity | high |
| Strength | `strong` |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:398-410` |

**Description.** When a projection fails, the handler writes an `ai_operations` row whose `pinnedProfileId`, `contextRevision`, and `snapshotFingerprint` are constants: the literal profile string `'prof_proj_2026_08_v1'`, the number `0`, and the string `'error'`. None of them is read from the evaluation, the snapshot, or the job.

`ai_operations` is the audit trail for AI work: the success path fills it from `evaluation.aiResult.profileId`, `snapshot.contextRevision`, and `snapshot.snapshotFingerprint` (`:244-246`). The failure path therefore emits rows that are *indistinguishable from real ones* by shape but carry invented provenance. `snapshotFingerprint: 'error'` is not a fingerprint, and `contextRevision: 0` is a valid revision number — revision 0 is exactly what an empty snapshot has (`topic-assignment-coordinator.ts:220` initialises `initialRevision = 0`).

There is a second, sharper problem in the same statement. The insert uses `.onConflictDoUpdate({ target: [aiOperations.districtId, aiOperations.operationType, aiOperations.targetId], set: { finalStatus: 'FAILED', ... } })`. The conflict target is the natural key the success path also writes. Wherever the two target keys *do* coincide — which is the common case for a topic whose job generation already equals its required generation — a subsequent failure overwrites the completed operation's `finalStatus` from `'COMPLETED'` to `'FAILED'`, and replaces its `resultPayload` with an error object, while leaving `contextRevision`/`snapshotFingerprint` as whatever the success path wrote. The audit row then claims the projection failed when the projection is in fact committed and visible to the Hokim.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:397-425
            try {
              const failedOpId = `aiop_${crypto.randomUUID()}`;
              await db
                .insert(aiOperations)
                .values({
                  id: failedOpId,
                  districtId,
                  mahallaName,
                  calendarDay,
                  operationType: 'TOPIC_DERIVED_PROJECTION',
                  targetId: `${topicId}:${generation}`,
                  pinnedProfileId: 'prof_proj_2026_08_v1',
                  contextRevision: 0,
                  snapshotFingerprint: 'error',
                  finalStatus: 'FAILED',
                  resultPayload: {
                    error: err instanceof Error ? err.message : String(err),
                  },
                })
                .onConflictDoUpdate({
                  target: [aiOperations.districtId, aiOperations.operationType, aiOperations.targetId],
                  set: {
                    finalStatus: 'FAILED',
```
```
// apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:244-246
                  pinnedProfileId: evaluation.aiResult.profileId,
                  contextRevision: snapshot.contextRevision,
                  snapshotFingerprint: snapshot.snapshotFingerprint,
```

**Why it matters.** `CONTEXT.md` defines Audit Record as append-only immutable admin/lifecycle/security events, and ADR-0005's whole premise is that AI work is traceable to an immutable profile so a district's output can be explained after the fact. A hardcoded profile id defeats that: the row asserts which profile ran without having observed it. The conflict-overwrite arm is worse in the other direction — a successful projection can be recorded as failed, and the Console's health telemetry will report a district as degraded while its dashboard serves correct data.

**Fix direction.** Do not synthesise provenance. If the failure happened before an evaluation existed, leave the profile/revision/fingerprint null (the columns should tolerate it) rather than substituting constants. For the conflict arm, do not let a failure clobber a `COMPLETED` row: guard the update with a status predicate (`WHERE final_status <> 'COMPLETED'`) or write the failure to a distinct target key so success and failure rows cannot collide. Delete the literal profile id — if a default profile is genuinely needed, read it from the AI gateway's configuration.

**Acceptance criteria.** (1) No hardcoded `prof_` string exists in `apps/backend/src/modules/topics/`. (2) `contextRevision` and `snapshotFingerprint` on a failed operation are either the real values or null — never `0` / `'error'`. (3) A committed projection's `finalStatus` cannot be changed to `FAILED` by a later failing attempt for the same natural key.

### L3-P05-18 — The hand-written ghost-job purge reaches into `pgboss` internals in two different ways

| Field | Value |
|---|---|
| Category | `leaky-seam` · `hidden-dependency` |
| Severity | medium |
| Strength | `strong` |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:107-111`, `apps/backend/src/modules/topics/topic-reconciliation-service.ts:258-263` |

**Description.** Two modules issue raw SQL against the `pgboss.job` table, and they use different predicates to describe the same cleanup:

- The handler, when a topic row is missing, deletes `WHERE name = 'telegram-topic-projection' AND data->>'topicId' = ${topicId}` with **no state filter** — it deletes jobs in any state, including `active` jobs currently being worked by another worker, and `completed` history.
- The reconciliation sweep deletes `WHERE j.name = 'telegram-topic-projection' AND j.state IN ('retry', 'created') AND NOT EXISTS (SELECT 1 FROM topics t WHERE t.id = (j.data->>'topicId'))` — state-filtered, which is safer, but only considers `retry` and `created` and never the other terminal states.

The queue name is also duplicated as a **string literal** in both statements (`'telegram-topic-projection'`) even though `TELEGRAM_TOPIC_PROJECTION_QUEUE` is imported in both files and used everywhere else. If the constant is renamed, both purges silently stop matching and become no-ops that log nothing.

Both call sites are wrapped in a `try`/`catch` that only `console.warn`s (`:112-114`, `:264-266`), so a failing purge is invisible.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:106-114
              try {
                await db.execute(sql`
                  DELETE FROM pgboss.job
                  WHERE name = 'telegram-topic-projection'
                    AND data->>'topicId' = ${topicId}
                `);
              } catch (delErr) {
                console.warn('Failed to purge ghost jobs for deleted topic:', delErr);
              }
```
```
// apps/backend/src/modules/topics/topic-reconciliation-service.ts:257-266
  try {
    await db.execute(sql`
      DELETE FROM pgboss.job j
      WHERE j.name = 'telegram-topic-projection'
        AND j.state IN ('retry', 'created')
        AND NOT EXISTS (SELECT 1 FROM topics t WHERE t.id = (j.data->>'topicId'))
    `);
  } catch (cleanErr) {
    console.warn('Periodic ghost topic projection purge failed:', cleanErr);
  }
```

**Why it matters.** `pgboss.job` is another library's schema. ADR-0002 makes pg-boss the transactional intake substrate, so depending on its table is a deliberate trade-off rather than an accident — but two *different* hand-written predicates for one concept means the cleanup rule is not owned anywhere. A maintainer reading either statement cannot tell which one is correct, and the handler's state-less delete can remove a job a worker is mid-execution on, which is the kind of interaction that is very hard to diagnose from logs. Deleting `completed` rows also destroys pg-boss's own retry/diagnostic history.

**Fix direction.** Own the purge once. Either a single helper (e.g. in the jobs adapter, beside the queue constants) that both callers use, or rely on pg-boss's own deletion policy and drop the hand-rolled SQL. If the raw SQL stays, interpolate `TELEGRAM_TOPIC_PROJECTION_QUEUE` instead of a literal, apply the state filter in both places, and state in one comment which states are safe to delete and why.

**Acceptance criteria.** (1) The literal `'telegram-topic-projection'` appears at most once in `apps/backend/src/modules/topics/`, or zero times if the adapter helper owns it. (2) No purge deletes rows in the `active` state. (3) Both call sites share one predicate.

### L3-P05-19 — `topics-data-cleaner.ts` owns three of the four tables its own finding set deletes into

| Field | Value |
|---|---|
| Category | `duplication` · `hidden-dependency` |
| Severity | medium |
| Strength | `worth-exploring` |
| Confidence | medium |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/topics-data-cleaner.ts:19-28`, `apps/backend/src/modules/ai/ai-data-cleaner.ts:14-16`, `apps/backend/src/modules/subscriptions/district-deletion-service.ts:281-282` |

**Description.** `createTopicsDataCleaner()` deletes `topic_projections`, `accepted_evidence`, then `topics`, in that order, and its doc block states the order is "strict FK topological order" because the first two reference `topics`.

Two observations.

First, the topological claim is weaker than it reads. `accepted_evidence` also references `telegram_intake_records`, and `ai_operations` is referenced *by* both `topics`-adjacent rows (`topic_projections.ai_operation_id`, `accepted_evidence.ai_operation_id`). The topics cleaner does not touch `ai_operations`; that belongs to `createAiDataCleaner()` (`ai-data-cleaner.ts:14-16`). So the deletion order across the two modules is a cross-module contract expressed nowhere: `district-deletion-service.ts:281-282` holds a `defaultCleaners` array whose iteration order is the real FK order, and the topics cleaner's comment claims an ordering guarantee it cannot enforce alone.

Second, the cleaner is the *only* place in this phase's four files that knows `accepted_evidence` is district-scoped and topic-owned. `accepted-evidence` is read by the P4 evidence path and written by the assignment coordinator, and its deletion lives here. That is not wrong — a module owning its tables' deletion is the right shape — but it means the file is load-bearing for a boundary that no interface declares.

I did not verify the FK constraints against the migration SQL, so the ordering claim itself is `observed` at the source-comment level only; whether a different order would actually fail is `inferred`. I am filing the ownership observation, not an ordering defect.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/topics-data-cleaner.ts:5-28
/**
 * Returns a DistrictDataCleaner that purges all topic-domain data for a district (ADR-001).
 *
 * Deletion order is strict FK topological order:
 *   1. topic_projections (FK -> topics)
 *   2. accepted_evidence (FK -> topics)
 *   3. topics (parent row)
 *
 * Must be called within the orchestrator transaction; does not open its own.
 */
export function createTopicsDataCleaner(): DistrictDataCleaner {
  return {
    moduleName: 'topics',

    async deleteDistrictData(tx, districtId) {
      // 1. topic_projections must be deleted before topics (FK constraint)
      await tx.delete(topicProjections).where(eq(topicProjections.districtId, districtId));

      // 2. accepted_evidence must be deleted before topics (FK constraint)
      await tx.delete(acceptedEvidence).where(eq(acceptedEvidence.districtId, districtId));

      // 3. topics parent rows last
      await tx.delete(topics).where(eq(topics.districtId, districtId));
    },
  };
}
```

**Why it matters.** District deletion is the destructive operation in this product (a customer leaving). The order that makes it safe is spread across a `defaultCleaners` array in a third module plus per-module comments. A maintainer adding a new table that references `topics` gets no signal from the topics cleaner that they must also register a cleaner and place it correctly.

**Fix direction.** Keep the per-module ownership. Make the cross-module ordering explicit at the orchestrator: a comment or a typed ordinal on each cleaner stating where it must sit relative to `topics` and `ai`, so the `defaultCleaners` array is documented rather than incidental. If the FK direction can be expressed, an integration test that runs district deletion against `mahalla_ovozi_test` and asserts zero rows across all district-scoped tables would pin the contract far better than a comment.

**Acceptance criteria.** (1) The topics cleaner states which other cleaners must run before and after it. (2) A district-deletion test asserts all four tables are empty for the deleted district. (3) `createTopicsDataCleaner()` remains the sole deleter of `topics`, `accepted_evidence`, and `topic_projections`.

### L3-P05-20 — The cron registration hardcodes `tz: 'UTC'` for a same-day product

| Field | Value |
|---|---|
| Category | `hidden-dependency` · `adr-conflict` |
| Severity | medium |
| Strength | `worth-exploring` |
| Confidence | medium |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:453-459`, `apps/backend/src/modules/topics/topic-reconciliation-service.ts:96` |

**Description.** The reconciliation sweep is registered as `boss.schedule(TELEGRAM_TOPIC_PROJECTION_RECONCILE_CRON_QUEUE, '*/2 * * * *', {}, { tz: 'UTC' })`. For a two-minute interval the timezone is irrelevant — the schedule fires every two minutes regardless — so this is not a bug in the sweep's *frequency*.

It matters because it is the codebase's one explicit statement that job scheduling is anchored to UTC, while the product's central temporal invariant is that a Topic is bound to a single calendar day in `Asia/Tashkent` (ADR-0003, `CONTEXT.md`). The sweep's own query reaches across days without a day predicate: `findUnprojectedTopics` filters on `t.status = 'ACTIVE'`, `t.retention_expires_at > NOW()`, and the generation comparison — it does **not** constrain `calendar_day`. So the sweep will re-enqueue projection jobs for Topics from any day whose retention window is still open, which is intentional for recovery, but means the sweep is the one component whose correctness depends on retention being the day boundary's proxy.

I am recording this as a `medium` worth-exploring observation, not a defect: I did not find a case where the sweep produces a wrong result, and the two-minute cadence makes the timezone inert today. The risk is latent — the moment any scheduled job in this pipeline needs day-boundary semantics, the `tz: 'UTC'` precedent is the wrong thing to copy.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:453-459
  // 2. Periodic recurring cron sweep every 2 minutes for unprojected or stale topics
  await boss.schedule(
    TELEGRAM_TOPIC_PROJECTION_RECONCILE_CRON_QUEUE,
    '*/2 * * * *',
    {},
    { tz: 'UTC' },
  );
```
```
// apps/backend/src/modules/topics/topic-reconciliation-service.ts:87-98
    WHERE t.status = 'ACTIVE'
      AND t.retention_expires_at > NOW()
      ${districtPredicate}
      AND d.status IN ('ACTIVE', 'GRACE')
      AND d.access_eligible IS NOT FALSE
      AND (
        tp.id IS NULL 
        OR t.applied_derived_generation < t.required_derived_generation
      )
      AND t.updated_at <= NOW() - (${graceSeconds} || ' seconds')::interval
    ORDER BY t.created_at ASC
    LIMIT ${batchLimit};
```

**Why it matters.** ADR-0003 makes the calendar day a product-level boundary, and the code that schedules work is where that boundary is either honoured or quietly ignored. A reader who sees `tz: 'UTC'` here has no way to know whether it was chosen deliberately (it fires every two minutes, so it does not matter) or copied from a pattern. The two-minute cadence also means the grace period — `graceSeconds` defaulting to 30 — is the only thing preventing the sweep from racing a just-created Topic, and that interaction is not documented at the schedule site.

**Fix direction.** Either comment why `tz: 'UTC'` is safe for an interval-only schedule, or drop the option since it has no effect. If any future scheduled job needs day-boundary semantics, it should derive its window from the `Asia/Tashkent` calendar-day helper rather than from `tz`. Separately, document at the schedule site that `graceSeconds` is what keeps the sweep from racing the assignment path.

**Acceptance criteria.** (1) The `tz` choice at the schedule site is either explained in a comment or removed. (2) The relationship between the two-minute cadence and `graceSeconds` is stated where the schedule is registered. (3) No scheduled job computes a calendar day without going through the shared `Asia/Tashkent` day helper.

### L3-P05-21 — The district lifecycle gate is copy-pasted four times across the slice with no owner

| Field | Value |
|---|---|
| Category | `duplication` |
| Severity | medium |
| Strength | `strong` |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:63-67`, `apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:171-175`, `apps/backend/src/modules/topics/topic-assignment-coordinator.ts:187-191`, `apps/backend/src/modules/topics/topic-assignment-coordinator.ts:288-292` |

**Description.** The same predicate — a district is unusable unless it exists, has `status` in `('ACTIVE', 'GRACE')`, and is not explicitly `accessEligible === false` — appears four times in the L3 topics slice, twice in each of the two modules. The assignment coordinator carries it as Gate 1 and Gate 2 around the AI call; the projection handler carries it as Gate 1 and Gate 2 around its AI call. The bodies differ only in the event name they log and the outcome they return (`DROPPED_INACTIVE_DISTRICT` with `gate: 'GATE_1' | 'GATE_2'`, versus a `console.log` and `continue`).

Each copy independently re-expresses the same three conditions against the same three columns. The comment at the projection handler's first gate cites "AC 1, 19 / AD-9" and the second cites "AC 1, Matrix #20 / AD-9" — the same acceptance criteria, satisfied twice per module because the AI call sits between them and the district could change during it.

The pre/post placement is correct and should not change: this is a TOCTOU guard and it needs both checks. What has no owner is the *predicate*.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:63-67
            if (
              !district ||
              (district.status !== 'ACTIVE' && district.status !== 'GRACE') ||
              district.accessEligible === false
            ) {
```
```
// apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:171-175
            if (
              !gate2District ||
              (gate2District.status !== 'ACTIVE' && gate2District.status !== 'GRACE') ||
              gate2District.accessEligible === false
            ) {
```
```
// apps/backend/src/modules/topics/topic-assignment-coordinator.ts:187-191
    if (
      !districtGate1 ||
      (districtGate1.status !== 'ACTIVE' && districtGate1.status !== 'GRACE') ||
      districtGate1.accessEligible === false
    ) {
```

**Why it matters.** The set of statuses that permit work is a domain rule, not an implementation detail. It currently lives in four `if` statements, so widening it (say, allowing `TRIAL` before `ACTIVE`) means finding all four, and the compiler will not help. The `GRACE` inclusion is itself a product decision that is nowhere stated except in these predicates.

**Deletion test.** Extract the predicate into one named function and the complexity does *not* vanish from the system — the guards must still run at four points, and the two modules have genuinely different failure behaviours. So this is not a deletion candidate. The duplication to remove is the *condition*, not the guard.

**Fix direction.** Put the rule in one place — a `isDistrictUsable(district)` predicate beside the districts module's own logic, or on its port — and let all four sites call it. Keep each site's own error handling and event names. If `GRACE` is a deliberate product allowance, say so at the predicate.

**Acceptance criteria.** (1) The literal condition `status !== 'ACTIVE' && status !== 'GRACE'` appears at most once in `apps/backend/src/modules/topics/`. (2) All four guard sites still run — two before and two after the AI calls. (3) The predicate's name states the domain rule, not the query shape.

### L3-P05-22 — A redundant `deps` alias sits in front of the injected-resolver seam

| Field | Value |
|---|---|
| Category | `shallow-module` |
| Severity | low |
| Strength | `strong` |
| Confidence | high |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:45-46`, `apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:137-139` |

**Description.** The handler destructures `deps` into `const { db, pool, boss, topicProjectionEvaluator } = deps;` and then immediately rebinds the whole object as `const options = deps;`. The only use of `options` is `options?.injectedEvidenceResolver` at `:137`, where the optional-chain and the redundant local both obscure a field that is already non-optional on the interface.

This is the smallest finding in the phase and I am recording it because it is the phase's only genuine pass-through: the alias contributes nothing, and the `?.` implies `options` may be undefined when the type says it cannot be.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:45-46
  const { db, pool, boss, topicProjectionEvaluator } = deps;
  const options = deps;
```
```
// apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:137-139
            const injected = options?.injectedEvidenceResolver
              ? await options.injectedEvidenceResolver(districtId, mahallaName, calendarDay)
              : undefined;
```

**Deletion test.** Delete `options` and rename its two uses to `deps`. Complexity vanishes; nothing reappears. This is a deletion target.

**Fix direction.** Remove the alias and read `deps.injectedEvidenceResolver` directly, matching how the assignment coordinator does it (`topic-assignment-coordinator.ts:236`). Drop the `?.` since the field is optional but the object is not — the correct guard is on the field alone.

**Acceptance criteria.** (1) `options` does not appear in `topic-projection-job-handler.ts`. (2) The injected-resolver check guards the field, not the deps object.

### L3-P05-23 — The two job handlers declare different batching contracts for the same worker

| Field | Value |
|---|---|
| Category | `untestable-interface` |
| Severity | low |
| Strength | `worth-exploring` |
| Confidence | medium |
| Verification | observed |
| Location | `apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:41-47`, `apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:447-451`, `apps/backend/src/modules/topics/jobs/topic-assignment-job-handler.ts:152-156` |

**Description.** Both handlers accept `jobs: PgBoss.Job<T>[]` and loop, which is the shape pg-boss requires. Their registrations disagree about how many jobs they will ever receive:

- The assignment handler registers with `{ newJobCheckInterval: 50, batchSize: 1 } as any` and its loop body carries a `break`-per-outcome structure that reads as though it expected one job.
- The projection handler registers with `{ newJobCheckInterval: 50 } as any` and no `batchSize`, then iterates with per-job `try`/`catch`/`finally` so one failure does not abort the batch.

The projection handler's per-job isolation is the correct pattern and is what makes an unbounded batch safe. But the two are registered on the same worker process and neither `as any` cast is explained, so a reader cannot tell whether `batchSize` was deliberately omitted from the projection registration or forgotten. With no `batchSize`, pg-boss's default decides how much AI work one fetch can trigger, and that default is not stated anywhere in this codebase.

I did not read pg-boss's default batch size for this version, so the *consequence* is `inferred`; the mismatch itself is `observed`.

**Verbatim evidence.**
```
// apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:447-451
  await boss.work<TelegramTopicProjectionJobData>(
    TELEGRAM_TOPIC_PROJECTION_QUEUE,
    { newJobCheckInterval: 50 } as any,
    (jobs) => processTopicProjectionJobs(jobs, deps),
  );
```
```
// apps/backend/src/modules/topics/jobs/topic-assignment-job-handler.ts:152-156
  await boss.work<TelegramTopicAssignmentJobData>(
    TELEGRAM_TOPIC_ASSIGNMENT_QUEUE,
    { newJobCheckInterval: 50, batchSize: 1 } as any,
    (jobs) => processTopicAssignmentJobs(jobs, deps),
  );
```

**Why it matters.** Batch size is how much paid AI work a single fetch can commit to. The assignment handler pins it to 1; the projection handler leaves it to a library default. Both are defensible, but the asymmetry is undocumented, and both options objects are `as any`-cast so the compiler is not checking either.

**Fix direction.** State the intended batch size for the projection queue explicitly (even if it equals the default) and comment why it differs from the assignment queue, or align them. Remove the `as any` if the options are expressible against pg-boss's types; if the cast exists because the installed type definitions lag the runtime, note which field forced it.

**Acceptance criteria.** (1) Both `boss.work` registrations declare `batchSize` explicitly. (2) Either the values match, or a comment states why they differ. (3) The reason for each `as any` on a `boss.work` options object is recorded.

## Deferred to L6

- **ADR-0006 (tenant scoping).** The reconciliation sweep's district predicate is a raw SQL fragment appended as `sql\`AND t.district_id = ${options.districtId}\`` (`topic-reconciliation-service.ts:59-61`), while every other query in the slice uses Drizzle's `eq`. Both are parameterised, so neither is an injection risk; whether a raw predicate fragment is acceptable inside a tenant-scoping regime is an ADR-0006 question. Recording the observation only; L6 owns ADR-0006.
- **ADR-0001 (hexagonal structure).** Both job handlers import Drizzle schema tables directly and hold a `pg.Pool` on their deps interface. Whether a job handler is an adapter (permitted) or a domain module (not permitted) is an ADR-0001 question. Not filed here.
- **ADR-0002 (transactional intake) — upheld.** Both handlers dispatch downstream work through `withTransactionalIntake`, and the projection handler's `boss.work` registrations are the only place a queue is touched outside it, which is the registration surface itself. No violation found; recorded deliberately so a later reader does not re-derive it.
- **ADR-0003 (same-day boundary) — upheld with one note.** Every projection job carries `calendarDay` from its producer and the handler passes it to `getMahallaDailySnapshot` unchanged; no job recomputes a day. The `tz: 'UTC'` note is filed as `L3-P05-20` rather than deferred, because it is a finding about this slice's code.

## Residual uncertainty

- **`L3-P05-16` is observed at the expression level, not executed.** I read all three expressions that must agree (the success-path key at `:195`, the failure-path key at `:407`, and the reconciliation lookup at `:196`) and they disagree. I did not run a failing projection to watch `issuesRaisedCount` stay at zero. Settling it needs a test that forces one projection failure with `generation < requiredDerivedGeneration` and then runs `reconcileUnprojectedTopics`; test execution was prohibited in this program. A simpler confirmation exists if it is ever needed: query `ai_operations` for `TOPIC_DERIVED_PROJECTION` rows with `final_status = 'FAILED'` and compare their `target_id` suffix against the matching topic's `required_derived_generation`.
- **`L3-P05-17` conflict arm is not executed.** The clobber requires a success and a failure to reach the same natural key `(district_id, operation_type, target_id)`. I verified the success path and the failure path both target that key; whether a failure can practically follow a success depends on pg-boss retry behaviour after a partial commit, which I could not observe without running the queue. The hardcoded-constants half of the finding needs no execution — those literals are read directly.
- **`L3-P05-19` ordering claim is not verified against migrations.** The comment asserts "strict FK topological order"; I did not read the migration SQL to confirm which foreign keys exist, so a different order *might* also succeed. The ownership observation stands regardless. Settling it requires reading `apps/backend/src/adapters/db/migrations/` (not read in this pass).
- **`L3-P05-20` — `tz: 'UTC'` consequence is not executed.** I did not run the scheduler to confirm the two-minute cadence makes the timezone inert, though a `*/2` interval expression has no day-boundary component to anchor. This is arithmetic, not observation, and I have marked it `worth-exploring` rather than `strong` accordingly.
- **`L3-P05-23` batch default not resolved.** I did not read pg-boss's default `batchSize` for the installed version. The finding is the undocumented asymmetry between the two registrations, which is observed; the operational consequence is not quantified.
- **Not examined:** the `operational_issues` consumers (which Console surface renders `TOPIC_PROCESSING_DELAY`), the retry-job producer that sets `pendingRetry`, and the health-check telemetry that reads `ai_operations.final_status`. Each would sharpen an impact claim above but none was needed to establish the finding.
- **Cross-pass note.** The assignment coordinator's CAS-on-a-different-connection defect recorded by the P5b pass (`L3-P05-10`) is *not* present in the projection handler, which locks the row with `for('update')` and re-checks the CAS on `tx` (`topic-projection-job-handler.ts:199-232`). I confirmed this by reading both. The slice therefore contains one correct CAS implementation and one broken one, which is worth knowing before anyone refactors them toward a shared helper.
- **Instrument:** `pnpm --filter @mahalla-ovozi/backend exec tsc --noEmit` exited 0 for this pass. No test suite was run, no `.env` was read, no git state was changed, and exactly one file was written.


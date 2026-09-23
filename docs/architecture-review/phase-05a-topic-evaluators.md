# Phase 5a — Topic evaluators

| Field | Value |
|---|---|
| Phase | L3-P05a |
| Layer | L3 topics |
| Owner | subagent |
| Status | complete |
| ADR lens | 0002 / 0003 |
| Scope | `apps/backend/src/modules/topics/topic-projection-evaluator.ts` (589 lines), `apps/backend/src/modules/topics/topic-matching-evaluator.ts` (393 lines) |
| Question | Do these two evaluators earn their keep as deep modules, or are they shallow, leaky, or duplicated? |
| Findings | 0 blocker · 2 high · 3 medium · 3 low |

## Phase question and method

**Answer: both evaluators earn their keep. The deletion test survives for both classes and for both free functions, so neither file is a deletion target. But depth is leaking at specific seams — one correctness defect inside the projection guardrails, one architectural leak where the shared AI gateway hard-codes both evaluators' output contracts, and one interface seam that is dead in production.**

Method. I used the deep-module vocabulary throughout (module, interface, depth, seam, adapter, leverage, locality) and used the **deletion test as the primary instrument**. For each candidate module and free function I asked whether deleting it makes complexity vanish (pass-through, shallow) or reappear across callers (earns its keep). I recorded every deletion-test outcome, including the ones where the candidate was NOT a valid deletion target — a survived deletion test is a result, not a non-result.

Files read IN FULL (in scope):
- `apps/backend/src/modules/topics/topic-projection-evaluator.ts` (all 589 lines)
- `apps/backend/src/modules/topics/topic-matching-evaluator.ts` (all 393 lines)

Files traced OUT of scope (read to understand callers, deps, and intended behaviour — no findings filed against them):
- `apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts` (sole production caller of `evaluateTopicProjection`)
- `apps/backend/src/modules/topics/topic-assignment-coordinator.ts` (sole production caller of `evaluateTopicAssignment`)
- `apps/backend/src/modules/topics/topic-matching-resolver.ts` (`computeLevenshteinDistance`)
- `apps/backend/src/modules/ai/ai-gateway.ts` (the adapter both evaluators call through `AiGatewayPort`)
- `apps/backend/src/modules/ai/context-snapshot.ts` (`groupSnapshotByTopic`, `formatEvidenceItemLine`)
- `apps/backend/src/modules/ai/semantic-relevance-evaluator.ts` (read for prompt-assembly duplication comparison)
- `docs/adr/0002-postgresql-pgboss-transactional-intake.md`, `docs/adr/0003-same-day-calendar-boundary.md`
- `CONTEXT.md`
- Tests read for intended behaviour only, never executed: `apps/backend/tests/topic-projection-evaluator.test.ts`, `apps/backend/tests/topic-matching-evaluator.test.ts`, `apps/backend/tests/unit/topic-matching-resilience.test.ts`

What I did NOT examine. I did not read the DB schema for `topic_projections` or `ai_operations`, the migrations, the React dashboard that renders projections, or anything under `docs/architecture-review/` (deliberately withheld to keep this pass independent). I ran no test suite. I read no `.env` file.

Instrument check. `pnpm --filter @mahalla-ovozi/backend exec tsc --noEmit` exited **0** (the one scoped typecheck the brief permits). The baseline compiles; nothing below is a build-breakage claim.

**Deletion tests performed, with outcomes:**

1. **Delete `TopicProjectionEvaluator`** (class at `topic-projection-evaluator.ts:275`). Complexity does NOT vanish. The single production caller (`topic-projection-job-handler.ts:153-158`) would have to absorb ~130 lines of prompt assembly plus seven post-generation guardrails (`topic-projection-evaluator.ts:440-573`). With N=1 caller the *leverage* argument is weak, but the *locality* argument is strong: the guardrails are testable today only because they sit behind one class. **Deletion test SURVIVES — not a deletion target.**

2. **Delete `TopicMatchingEvaluator`** (class at `topic-matching-evaluator.ts:278`). Complexity does NOT vanish; `topic-assignment-coordinator.ts:261-272` would absorb ~90 lines of snapshot-rendering prompt assembly. **Deletion test SURVIVES — not a deletion target.**

3. **Delete `findDirectReplyTopic`** (`topic-matching-evaluator.ts:146`). Complexity reappears not as code but as *cost*: every direct Telegram reply would fall through to a paid AI call instead of a 20-line indexed DB lookup. **Deletion test SURVIVES — not a deletion target.** Its interface is nevertheless shallow (finding L3-P05-05).

4. **Delete `isUzbekCyrillic`** (`topic-projection-evaluator.ts:23`). The 8-line predicate is called twice inside the projection guardrails (`topic-projection-evaluator.ts:526`, `topic-projection-evaluator.ts:566`) and exported for tests (`topic-projection-evaluator.test.ts:14-31`). Complexity would reappear twice and the negative-case coverage would be lost. **Deletion test SURVIVES, weakly — not a deletion target.** This is a pure function extracted for genuine testability, and it is the one place in either file where that trade is fully justified.

**ADR-0002 / ADR-0003 conformance (Chesterton's Fence results).** No ADR-0002 or ADR-0003 violation was found, and I record that deliberately:
- Both evaluators are invoked **outside** any DB transaction and their results are committed later inside `withTransactionalIntake` (`topic-projection-job-handler.ts:152-158` then `topic-projection-job-handler.ts:199`; `topic-assignment-coordinator.ts:261-272` then the atomic commit). No AI call holds a pooled Postgres connection open. This is exactly the ADR-0002 invariant and it is upheld.
- `findDirectReplyTopic` scopes its lookup by `calendarDay` (`topic-matching-evaluator.ts:163`), and both evaluators receive an already same-day-scoped `MahallaDailySnapshot`. Topics cannot roll over midnight through this path. ADR-0003 is upheld.

The one ADR-adjacent concern is that finding L3-P05-01 can cause a *wrong* `anchorEvidenceId` to be written by an otherwise-correct transactional commit, weakening the "PostgreSQL is our single system of record" guarantee at the data level. I filed it as a correctness defect rather than an ADR-0002 conflict, because the transactional intake mechanism itself is not at fault.

## Findings

### L3-P05-01 — Anchor index resolves against a different list than the one the prompt labels

| Field | Value |
|---|---|
| Category | `correctness` |
| Severity | `high` |
| Strength | `strong` (defect, not a deepening candidate) |
| Confidence | high |
| Verification | `observed` |
| Location | `apps/backend/src/modules/topics/topic-projection-evaluator.ts:316-319`, `apps/backend/src/modules/topics/topic-projection-evaluator.ts:341-347`, `apps/backend/src/modules/topics/topic-projection-evaluator.ts:448-454` |

**Description.** When the target Topic carries more than 15 evidence items, `buildUserPrompt` truncates the list to the **last 15** (`targetEvidence.slice(-15)`) and then numbers the surviving items `Evidence #1 … Evidence #15` using the *truncated* array index. The model is therefore told that a mid-list item is `Evidence #1`. The guardrail later resolves `anchor_evidence_index` as `targetEvidence[data.anchor_evidence_index - 1]` against the **untruncated** array. For a Topic with N > 15 items the two lists differ by exactly `N - 15` positions, so every index the model returns resolves to the wrong evidence item — or, once `N - 15 + 1 > 15`, to an item the model never saw in its `Evidence #N` numbering at all. The resolved item is then persisted as `anchorEvidenceId` by the caller (`topic-projection-job-handler.ts:295`, `topic-projection-job-handler.ts:314`), so this is a durable wrong-anchor write, not a transient one.

**Verbatim evidence.**
```ts
// apps/backend/src/modules/topics/topic-projection-evaluator.ts:316-319
const cappedTargetEvidence =
  targetEvidence.length > 15
    ? targetEvidence.slice(-15)
    : targetEvidence;
```
```ts
// apps/backend/src/modules/topics/topic-projection-evaluator.ts:341-347
return formatEvidenceItemLine(it, idx, {
  prefix: `Evidence #${idx + 1}`,
  includeId: true,
  indent: '  ',
  timeLabel: 'Time',
  authorLabel,
});
```
```ts
// apps/backend/src/modules/topics/topic-projection-evaluator.ts:447-454
// 1a. Surrogate 1-based index resolution
if (
  typeof data.anchor_evidence_index === 'number' &&
  data.anchor_evidence_index >= 1 &&
  data.anchor_evidence_index <= targetEvidence.length
) {
  resolvedAnchorEvidence = targetEvidence[data.anchor_evidence_index - 1];
}
```

The prompt even advertises the untruncated total immediately next to the truncated listing, which makes the mismatch invisible to the model:
```ts
// apps/backend/src/modules/topics/topic-projection-evaluator.ts:357
sections[0] += `\n- Distinct Reporting Residents: ${citizenSummary}\n- Total Evidence Items: ${targetEvidence.length} message(s)`;
```

**Why it matters.** `anchor_evidence_id` / `anchor_quote` are the Audit-Record-grade provenance of a Topic Card. A silent off-by-`N-15` anchor means the District Hokim's dashboard can attribute a Topic to the wrong resident message while the quote text (which the model copied from what it actually saw) contradicts the id. The id path is the one taken whenever the model returns an index, which the schema and prompt actively encourage (`topic-projection-evaluator.ts:72` describes the field as "1-based index of the anchor evidence item (e.g. 1 for Evidence #1)").

**Deletion test.** Not applicable — this is a defect inside a module whose deletion test survived (see Phase question). The `anchor_evidence_index` surrogate itself cannot simply be deleted: it exists because models are unreliable at reproducing opaque DB ids verbatim, which is also why the Levenshtein recovery tier exists at `topic-projection-evaluator.ts:461-476`.

**Fix direction.** Make the labelled list and the resolver share one array. Either resolve the index against the same capped array that was rendered, or keep the full array for rendering and label each line with its true 1-based position so the index is globally meaningful. Whichever is chosen, the truncation constant must stop being a bare literal duplicated between the renderer and the resolver.

**Acceptance criteria.** (1) A test constructs a Topic with more than 15 evidence items and asserts that the anchor resolved from `anchor_evidence_index: 1` is the same item the prompt labelled `Evidence #1`. (2) No path exists where `targetEvidence.length` and the length of the list the model is shown can disagree without the labels compensating.

### L3-P05-02 — Both evaluators' output contracts are rewritten by an undeclared normalizer in the shared gateway

| Field | Value |
|---|---|
| Category | `hidden-dependency` |
| Severity | `high` |
| Strength | `strong` (defect, not a deepening candidate) |
| Confidence | high |
| Verification | `observed` |
| Location | `apps/backend/src/modules/topics/topic-projection-evaluator.ts:429-436`, `apps/backend/src/modules/topics/topic-matching-evaluator.ts:384-391` |

**Description.** Both evaluators treat "I passed my Zod schema to `generateStructured`" as the guarantee that the model's payload is validated as-written. It is not. The shared adapter that both call through (`ai-gateway.ts`, out of scope for findings — cited here only as the dependency these in-scope modules sit on) mutates the parsed payload *before* `safeParse`, with branches hard-coded to these two evaluators' field names and to the `TopicMatchingDecisionEnum` literals. From the evaluators' side of the seam this is an undeclared invariant: their interface says "validated against my schema", their actual behaviour is "validated against my schema *after* a third party coerced fields my schema declares".

**Verbatim evidence.**
The in-scope call sites — these are the interfaces as written:
```ts
// apps/backend/src/modules/topics/topic-matching-evaluator.ts:384-391
return this.aiGateway.generateStructured<TopicMatchingResult>({
  operationType: 'TOPIC_MATCHING',
  profileId: input.profileId,
  systemPrompt: TOPIC_MATCHING_SYSTEM_PROMPT,
  userPrompt,
  schema: TopicMatchingResultSchema,
  schemaName: 'topic_matching_result',
});
```
```ts
// apps/backend/src/modules/topics/topic-projection-evaluator.ts:429-436
const aiResult = await this.aiGateway.generateStructured<TopicProjectionResult>({
  operationType: 'TOPIC_DERIVED_PROJECTION',
  profileId: input.profileId,
  systemPrompt: TOPIC_PROJECTION_SYSTEM_PROMPT,
  userPrompt,
  schema: TopicProjectionResultSchema,
  schemaName: 'topic_projection_result',
});
```
The behaviour actually applied behind that interface (out-of-scope supporting evidence, `apps/backend/src/modules/ai/ai-gateway.ts:231-256`):
```ts
// apps/backend/src/modules/ai/ai-gateway.ts:231-256
// Normalize model quirks (e.g. LLM populating dummy exclusion_reason when is_relevant: true, or exceeding max chars)
if (parsedJson && typeof parsedJson === 'object') {
  if (typeof parsedJson.reasoning === 'string' && parsedJson.reasoning.length > 300) {
    parsedJson.reasoning = parsedJson.reasoning.slice(0, 300);
  }
  if (parsedJson.is_relevant === true && parsedJson.exclusion_reason !== null) {
    parsedJson.exclusion_reason = null;
  } else if (
    parsedJson.is_relevant === false &&
    Array.isArray(parsedJson.relevant_lanes) &&
    parsedJson.relevant_lanes.length > 0
  ) {
    parsedJson.relevant_lanes = [];
  }
  if (parsedJson.decision === 'MATCH_EXISTING_TOPIC') {
    parsedJson.primary_lane = null;
  } else if (parsedJson.decision === 'NEW_TOPIC') {
    parsedJson.matched_topic_id = null;
  } else if (parsedJson.decision === 'UNASSIGNABLE_VAGUE') {
    parsedJson.matched_topic_id = null;
    parsedJson.primary_lane = null;
  }
  if (Array.isArray(parsedJson.lanes)) {
    parsedJson.lanes = Array.from(new Set(parsedJson.lanes));
    parsedJson.is_hokim_related = parsedJson.lanes.includes('HOKIM_RELATED');
  }
}
```

**Why it matters.** The gateway is supposed to be the provider-neutral adapter (one of its stated design goals) and it is now coupled to the topic-matching decision enum and to three different evaluators' field names. Two consequences follow. First, locality: a reader of `topic-matching-evaluator.ts` cannot determine what a successful parse actually guarantees — the `.refine` at `topic-matching-evaluator.ts:97-120` is, in production, unreachable for the `primary_lane` / `matched_topic_id` consistency arms, because those fields were already forced into compliance upstream. Second, the seam is not where it claims to be: changing the matching contract requires editing the gateway, which is exactly the kind of change a seam exists to make unnecessary.

**Deletion test.** Deleting the normalizer is NOT viable — the model-quirk coercion is genuinely load-bearing (the comment documents real LLM misbehaviour, and `reasoning` is `.max(300)` at `topic-matching-evaluator.ts:94` while the gateway slices at 300 chars, so removing it would convert malformed-but-recoverable outputs into `INVALID_OUTPUT_SEMANTICS` retries). The correct conclusion is that the behaviour belongs to the evaluators, not that it should be removed. **Deletion test SURVIVES — the normalizer earns its keep, in the wrong module.**

**Fix direction.** Move each evaluator's contract-specific coercion into that evaluator, next to its schema — e.g. as a `z.preprocess` on the schema it already owns, which `TopicMatchingResultSchema` already demonstrates at `topic-matching-evaluator.ts:28-67`. That is what makes this a fixable leak rather than a design dead end: the in-scope file already contains the exact pattern needed. Leave only truly provider-generic cleanup (markdown fence stripping at `ai-gateway.ts:210-213`) in the adapter.

**Acceptance criteria.** (1) `ai-gateway.ts` contains no reference to `decision`, `primary_lane`, `matched_topic_id`, `is_hokim_related`, `reasoning`, `is_relevant`, `exclusion_reason`, or `relevant_lanes`. (2) The normalizer's behaviour is still covered by the evaluator-owned tests. (3) The `.refine` at `topic-matching-evaluator.ts:97-120` is reachable in production for at least one of its consistency arms.

### L3-P05-03 — The two system prompts are one 2700-word domain document maintained in two divergent copies

| Field | Value |
|---|---|
| Category | `duplication` |
| Severity | `medium` |
| Strength | `worth-exploring` (deepening candidate) |
| Confidence | high |
| Verification | `observed` |
| Location | `apps/backend/src/modules/topics/topic-projection-evaluator.ts:135-273`, `apps/backend/src/modules/topics/topic-matching-evaluator.ts:171-276` |

**Description.** `TOPIC_PROJECTION_SYSTEM_PROMPT` (~139 lines) and `TOPIC_MATCHING_SYSTEM_PROMPT` (~106 lines) are not two prompts about different things — they are two encodings of the *same* domain rules, written as flat prose constants inside two different classes. Both carry the identical `PART I` / `PART II` structure, and both restate: communal utility outages are mahalla-wide and location-agnostic; acute physical point hazards are a strictly separate class that must never merge into a supply outage; Hokim/Hokimiyat qualification and causal consolidation; the `qurimoq`/`qurmoq` homonym rule; minimal bipartite disruption reports (`suv kemadiku`, `svet o'chdi`) are never vague; and HOKIM_RELATED must never cross service lanes. The prompt constants are the *implementation* here — the depth of these modules lives largely in prose — so a domain rule change is an edit to two independent string literals that can silently drift.

**Verbatim evidence.**
```ts
// apps/backend/src/modules/topics/topic-matching-evaluator.ts:185-187
- BUT: ACUTE PHYSICAL ASSET HAZARDS ARE STRICTLY ISOLATED FROM GENERAL SUPPLY OUTAGES (CRITICAL INVARIANT):
  - A physical infrastructure breach, rupture, leak, or fire hazard (e.g. a broken water pipe flooding a street, an overflowing sewage manhole, an exploding transformer or downed live wire, a leaking/ruptured gas line) is an acute localized point emergency.
  - IT HAS AN INCOMPATIBLE FAILURE PREDICATE FROM QUIET HOUSEHOLD SUPPLY OUTAGES AND MUST NEVER BE MERGED INTO A GENERAL SUPPLY OUTAGE TOPIC!
```
```ts
// apps/backend/src/modules/topics/topic-projection-evaluator.ts:183-188
- Acute Localized Physical Hazards (Pipe Bursts / Flooding / Transformer Fires Only):
  - For dedicated acute physical emergency hazard topics (pipe leaks/bursts, sewage overflow, transformer fires):
  - When accepted evidence for that acute hazard mentions a specific street name or landmark (e.g. "Bog'zor ko'chasida", "elektroset arqasidagi ko'chada", "14-maktab yonida"):
  - Extract this landmark and prefix it in authentic Uzbek Cyrillic into the title (e.g. "Электросеть орқасидаги кўчада сув қувурининг сизиши ёки оқиб кетиши хабар қилинмоқда.", "Боғзор кўчасида сув қувурининг сизиши ёки оқиб кетиши хабар қилинмоқда.", "14-мактаб ёнида канализация тошгани хабар қилинмоқда.").
  - NEVER strip the landmark or street reference to produce a generic unlocalized template when the topic is dedicated to an acute localized physical hazard!
  - If NO location or street is mentioned anywhere in the acute hazard evidence, use: "Сув қувурининг сизиши ёки оқиб кетиши хабар қилинмоқда."
```
```ts
// apps/backend/src/modules/topics/topic-matching-evaluator.ts:249-251
3. Chat Silence & Multi-Incident Disambiguation for Localized Follow-ups:
   - Within 30 minutes of chat activity: Match to the topic of the immediate preceding recent message (N-1 in chat).
   - After >30 minutes of chat silence: When multiple localized physical incident topics exist in the same lane and a follow-up does not name a street or landmark, The AI MUST NOT guess between the two localized streets -> classify as UNASSIGNABLE_VAGUE.
```

**Why it matters.** The two documents have already diverged in ways that matter. The matching prompt carries the 30-minute chat-silence disambiguation rule (`topic-matching-evaluator.ts:250-251`) that the projection prompt does not mention, while the projection prompt carries the acute-hazard landmark-extraction rule (`topic-projection-evaluator.ts:183-188`) that the matching prompt lacks. A maintainer who learns the Class A / Class B partition from one file has read half the contract. This is the low-locality symptom the brief asks about: understanding one concept requires bouncing between two files, with no single place that states the rule.

**Before/after interface sketch.**
- Before: `TOPIC_PROJECTION_SYSTEM_PROMPT: string`, `TOPIC_MATCHING_SYSTEM_PROMPT: string` — two independent exported constants, each an unvalidated prose blob, in two classes' module scope.
- After: one module owning the shared domain rules as named fragments (`SUPPLY_OUTAGE_VS_POINT_HAZARD_RULE`, `HOKIM_QUALIFICATION_RULE`, `LEXICAL_DISAMBIGUATION_RULES`, `CLUSTERING_DECISION_CONTRACT`) plus two thin composers (`buildTopicProjectionSystemPrompt()`, `buildTopicMatchingSystemPrompt()`) that assemble the fragments with the phase-specific sections. Callers see the same two strings; maintainers get one editable source for the shared rules.

**Deletion test.** Deleting either prompt is impossible — the modules' entire value is the policy encoded in prose, which is precisely why the duplication is expensive rather than cosmetic. **Deletion test SURVIVES — not a deletion target.** The candidate here is not deletion but *re-seaming*: one module owning the shared fragments.

**Fix direction.** Extract the genuinely shared rules into one module of named fragments (the domain rules), and keep each evaluator's phase-specific sections and output-format instruction local. Do not attempt a single unified prompt — the two phases ask different questions and must keep different terminators and decision taxonomies.

**Acceptance criteria.** (1) The Class A / Class B partition rule, the Hokim qualification rule, and the homonym rule each exist in exactly one place in `apps/backend/src/`. (2) Both composed prompts still contain every rule present today (a golden-file or substring test over the composed strings). (3) Adding a future domain rule requires one edit, not two.

### L3-P05-04 — `profileId` is threaded through both interfaces and populated by neither caller

| Field | Value |
|---|---|
| Category | `shallow-module` |
| Severity | `medium` |
| Strength | `strong` |
| Confidence | medium |
| Verification | `observed` (call sites) / `inferred` (unused in production) |
| Location | `apps/backend/src/modules/topics/topic-projection-evaluator.ts:118`, `apps/backend/src/modules/topics/topic-matching-evaluator.ts:137`, `apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:153-158`, `apps/backend/src/modules/topics/topic-assignment-coordinator.ts:261-272` |

**Description.** Both input interfaces declare an optional `profileId?: string`, and both implementations forward it verbatim as `profileId: input.profileId` into the gateway call. Neither production caller supplies it. The two modules therefore advertise a profile-pinning capability that no caller uses — interface surface with no behaviour behind it, which is the definition of shallow. Note the `aiResult.profileId` that both modules *return* is a different value: it is whatever the gateway resolved and reports, not the caller's pin.

**Verbatim evidence.**
```ts
// apps/backend/src/modules/topics/topic-matching-evaluator.ts:126-138
export interface EvaluateTopicAssignmentInput {
  candidateText: string;
  telegramMessageId: string;
  telegramUserId?: string;
  authorHandle?: string;
  originalTimestamp: string;
  contentType: 'TEXT' | 'MEDIA_CAPTION';
  replyMetadata: TelegramReplyMetadata | null;
  relevantLanes: QualifyingLane[];
  relevanceReasoning?: string;
  snapshot: MahallaDailySnapshot;
  profileId?: string;
}
```
The sole production call site omits it entirely — note that every field is passed explicitly and `profileId` is not among them:
```ts
// apps/backend/src/modules/topics/topic-assignment-coordinator.ts:261-272
matchingAiResult = await topicMatchingEvaluator.evaluateTopicAssignment({
  candidateText: verbatimText,
  telegramMessageId,
  telegramUserId: effectiveUserId,
  authorHandle,
  originalTimestamp,
  contentType,
  replyMetadata,
  relevantLanes,
  relevanceReasoning: reasoning,
  snapshot,
});
```
```ts
// apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:153-158
const evaluation = await topicProjectionEvaluator.evaluateTopicProjection({
  topicId,
  primaryLane: targetTopic.primaryLane as QualifyingLane,
  generation: targetGeneration,
  snapshot,
});
```

**Why it matters.** `profileId` is a real seam in the gateway (ADR-0005 territory — immutable pinned profiles), so this is not dead code so much as an *unused seam* on the evaluators' interfaces. It costs every reader of these modules a question they cannot answer from the files: "when is this set?" The honest answer today is "in tests only". **Caveat and Chesterton's Fence:** the field may be deliberately pre-positioned for the reconciliation/backfill path, and `apps/backend/tests/topic-projection-reconciliation.test.ts` and `apps/backend/tests/unit/topic-matching-resilience.test.ts` do exercise these evaluators directly. I could not find a production caller that pins a profile through this path, but absence of a caller in the current tree is weaker evidence than a comment stating intent.

**Deletion test.** Deleting `profileId` from both input interfaces would simplify them, and the gateway already resolves a profile when none is pinned — so complexity would not reappear as duplicated logic. But it *would* remove a capability the reconciliation path may need. **Deletion test result: INCONCLUSIVE — record as shallow interface, do not delete without confirming the reconciliation path.**

**Fix direction.** Either wire a caller (if profile pinning for reconciliation is intended) or remove the field and let the gateway's profile resolution be the only path. Whichever is chosen, state the intent in the interface so the next reader is not left guessing.

**Acceptance criteria.** (1) `rg "profileId" apps/backend/src/modules/topics` shows the field either populated by at least one non-test caller or absent from both interfaces. (2) The interface declares *why* the pin exists if it is kept.

### L3-P05-05 — `findDirectReplyTopic` collapses three distinct outcomes into one `string | null`

| Field | Value |
|---|---|
| Category | `shallow-module` |
| Severity | `medium` |
| Strength | `worth-exploring` (deepening candidate) |
| Confidence | high |
| Verification | `observed` |
| Location | `apps/backend/src/modules/topics/topic-matching-evaluator.ts:146-169` |

**Description.** The function returns only `string | null`, but its own query can distinguish at least three situations that its caller cannot: (a) no parent message exists in this Mahalla/day/chat at all; (b) a parent exists but carries a null `topicId`; (c) a parent exists and carries a topic id. The caller receives `null` for both (a) and (b) and must fall through to a paid AI call. The information needed to make that decision better is computed by this module and then thrown away at its own seam — the classic shallow-interface shape where the caller ends up re-deriving or over-paying for what the module already knew.

**Verbatim evidence.**
```ts
// apps/backend/src/modules/topics/topic-matching-evaluator.ts:146-169
export async function findDirectReplyTopic(
  db: DbClient,
  districtId: string,
  mahallaName: string,
  calendarDay: string,
  telegramChatId: string,
  replyToMessageId: string,
): Promise<string | null> {
  const [parentRecord] = await db
    .select({ topicId: acceptedEvidence.topicId })
    .from(acceptedEvidence)
    .where(
      and(
        eq(acceptedEvidence.districtId, districtId),
        eq(acceptedEvidence.telegramChatId, telegramChatId),
        eq(acceptedEvidence.telegramMessageId, replyToMessageId),
        eq(acceptedEvidence.mahallaName, mahallaName),
        eq(acceptedEvidence.calendarDay, calendarDay),
      ),
    )
    .limit(1);

  return parentRecord?.topicId ?? null;
}
```

**Why it matters.** The query is a fast path whose entire purpose is to avoid an AI call; its interface discards exactly the distinction ("found but unassigned" vs "not found") that would let the caller decide whether the fast path actually applied. It also drops the parent's identity, which matters because this is the one place in the topic pipeline that resolves a reply target *directly* rather than through the AI.

**Before/after interface sketch.**
- Before: `findDirectReplyTopic(db, districtId, mahallaName, calendarDay, telegramChatId, replyToMessageId): Promise<string | null>`.
- After: returns a discriminated result, e.g. `{ outcome: 'FOUND_ASSIGNED', topicId: string } | { outcome: 'FOUND_UNASSIGNED' } | { outcome: 'NO_PARENT_IN_SCOPE' }`, so the caller can treat only the first as a fast-path hit while still using `FOUND_UNASSIGNED` as real evidence that the parent existed within the same day scope.

**Deletion test.** Deleting the function sends every direct reply to the AI. Complexity reappears as cost, not as code — **deletion test SURVIVES; not a deletion target.** The finding is about deepening the interface, not removing the function.

**Fix direction.** Widen the return type to carry the outcome and the parent's identity. Keep the signature's dependency on `db` — the function is deliberately a DB-resolving unit and hiding that behind the evaluator class would make the seam worse, not better.

**Acceptance criteria.** (1) A caller can distinguish "parent not found" from "parent found and unassigned" without issuing a second query. (2) The fast path still issues exactly one query. (3) Existing coverage of the function's current behaviour still passes.

### L3-P05-06 — `isUzbekCyrillic` is a ratio heuristic living in a Topic evaluator

| Field | Value |
|---|---|
| Category | `low-locality` |
| Severity | `low` |
| Strength | `speculative` |
| Confidence | high (behaviour) / medium (that it is a problem) |
| Verification | `observed` |
| Location | `apps/backend/src/modules/topics/topic-projection-evaluator.ts:18-31` |

**Description.** `isUzbekCyrillic` is a generic script-detection predicate (a 70% Cyrillic-to-alphabetic ratio) that is exported from the Topic projection evaluator and used as a *correctness guardrail* there. It is not about topics — it is about the product's Uzbek-Cyrillic output requirement. It sits in the wrong module for its concept, and because it is a ratio rather than a script check it accepts strings that are up to 30% Latin.

**Verbatim evidence.**
```ts
// apps/backend/src/modules/topics/topic-projection-evaluator.ts:23-31
export function isUzbekCyrillic(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const cyrillicMatches = text.match(/[а-яёқғҳў]/gi) || [];
  const alphabeticMatches = text.match(/[a-zа-яёқғҳў]/gi) || [];
  if (alphabeticMatches.length === 0) {
    return cyrillicMatches.length > 0;
  }
  return cyrillicMatches.length / alphabeticMatches.length >= 0.7;
}
```

**Why it matters.** The threshold is load-bearing and undocumented: it decides whether a projection is accepted or retried. It is covered by tests (`apps/backend/tests/topic-projection-evaluator.test.ts:14-31`, including the useful negative cases at `:30-31`), so the behaviour is not unknown — but the *reason* for 0.7 over, say, requiring zero Latin is nowhere in the code. **Chesterton's Fence:** a strict "no Latin at all" rule would likely reject legitimate summaries containing Latin proper nouns, street names, or numerals; the 0.7 tolerance is probably deliberate. I am recording the placement, not proposing a stricter threshold.

**Deletion test.** Deleting it would duplicate the predicate across two guardrails and lose focused coverage — **deletion test SURVIVES; not a deletion target.** The opportunity is relocation, not removal.

**Fix direction.** Move the predicate next to the other shared text/domain helpers (it already sits in the same module family as the snapshot formatters) and record the rationale for the 0.7 threshold beside it. No behaviour change.

**Acceptance criteria.** (1) The predicate is importable without importing the projection evaluator. (2) The threshold's rationale is stated in the source. (3) Its existing test cases move with it unchanged.

### L3-P05-07 — Privacy and filler guardrails inspect different field sets

| Field | Value |
|---|---|
| Category | `error-handling` |
| Severity | `low` |
| Strength | `strong` |
| Confidence | high |
| Verification | `observed` |
| Location | `apps/backend/src/modules/topics/topic-projection-evaluator.ts:533-561` |

**Description.** Guardrail 5 (phone numbers) tests four fields: `summary`, `anchor_quote`, `attribution`, `latest_update`. Guardrail 6 (bureaucratic filler) tests only two: `summary` and `latest_update`. `attribution` and `anchor_quote` are unguarded against filler. The asymmetry is invisible from either guardrail alone — each reads as complete. The residual risk is small (the filler regex targets status-report phrases that would be odd in an attribution), but `anchor_quote` is model-generated text surfaced to the Hokim, and it is explicitly required to be a verbatim excerpt, so a fabricated filler quote is exactly the failure this module's guardrails exist to prevent.

**Verbatim evidence.**
```ts
// apps/backend/src/modules/topics/topic-projection-evaluator.ts:534-539
const phoneRegex = /(?:\+?998|\b)[0-9]{9,}\b/;
if (
  phoneRegex.test(data.summary) ||
  phoneRegex.test(data.anchor_quote) ||
  (data.attribution && phoneRegex.test(data.attribution)) ||
  (data.latest_update && phoneRegex.test(data.latest_update))
) {
```
```ts
// apps/backend/src/modules/topics/topic-projection-evaluator.ts:548-561
const bureaucraticFillerRegex =
  /(?:маълумот\s+олинмоқда|ҳолати\s+ўрганилмоқда|аниқлик\s+киритилмоқда|муҳокама\s+қилинмоқда|барқарорлиги\s+ҳақида|маълумот\s+алмашилмоқда|ҳолати\s+(?:бўйича|юзасидан)\s+маълумот)/i;
if (bureaucraticFillerRegex.test(data.summary)) {
  throw new AiGatewayError(
    'INVALID_OUTPUT_SEMANTICS',
    `Summary contains prohibited bureaucratic filler/placeholder: "${data.summary}". Must state the core reported civic disruption directly.`,
  );
}
if (data.latest_update && bureaucraticFillerRegex.test(data.latest_update)) {
```

**Why it matters.** Seven guardrails are applied to a single model output, and they are applied field-by-field with hand-maintained field lists. That is the shape that produces omissions: the rule and the set of fields it covers are two separate things a maintainer must keep in sync, with nothing enforcing it.

**Deletion test.** Not a deletion candidate — guardrails are the module's core value. **Deletion test SURVIVES.**

**Fix direction.** Make the field list explicit and shared: one array of the model-produced text fields, iterated by every textual guardrail, so a new field is covered by all guardrails by construction rather than by remembering.

**Acceptance criteria.** (1) Adding a new text field to `TopicProjectionResult` automatically subjects it to both the phone and filler checks, or fails to compile until it is listed. (2) A test asserts filler in `anchor_quote` is rejected.

### L3-P05-08 — Lane enum aliases duplicated verbatim in both files

| Field | Value |
|---|---|
| Category | `duplication` |
| Severity | `low` |
| Strength | `strong` |
| Confidence | high |
| Verification | `observed` |
| Location | `apps/backend/src/modules/topics/topic-projection-evaluator.ts:15-16`, `apps/backend/src/modules/topics/topic-matching-evaluator.ts:18-19` |

**Description.** Both files independently re-export `QualifyingLaneSchema` under the name `QualifyingLaneEnum` and re-export the `QualifyingLane` type. Two aliases for one canonical contract symbol, defined twice, with no single owner. It is a small duplication with a specific cost: a reader looking for where the Lane contract is named `QualifyingLaneEnum` finds two identical answers and no way to tell which is canonical.

**Verbatim evidence.**
```ts
// apps/backend/src/modules/topics/topic-projection-evaluator.ts:15-16
export const QualifyingLaneEnum = QualifyingLaneSchema;
export { type QualifyingLane };
```
```ts
// apps/backend/src/modules/topics/topic-matching-evaluator.ts:18-19
export const QualifyingLaneEnum = QualifyingLaneSchema;
export { type QualifyingLane };
```

**Why it matters.** The canonical definition lives in `@mahalla-ovozi/api-contracts`, so this is a naming duplication rather than a competing source of truth — which is why it is `low` and not `medium`. It matters mostly because the alias exists to give the topic pipeline its own vocabulary for a shared contract, and that vocabulary has no owner.

**Deletion test.** Deleting both aliases and importing the contract symbol directly would remove the duplication with no complexity reappearing — **this is the one candidate in this phase where the deletion test does NOT survive: the aliases are a genuine pass-through.** Recorded as shallow and a valid (if minor) deletion target.

**Fix direction.** Import the contract symbol directly, or define the alias exactly once in one topic-module location that both files import.

**Acceptance criteria.** (1) `rg "QualifyingLaneEnum = QualifyingLaneSchema" apps/backend/src` returns at most one match. (2) No consumer of either file needs a new import path.

## Deferred to L6

These observations are recorded WITHOUT a finding id, because they belong to the L6 layer's ADRs and filing them here would double-count them.

1. **ADR-0006 (explicit tenant scoping).** `findDirectReplyTopic` (`topic-matching-evaluator.ts:146-169`) enforces district isolation through an application-level `eq(acceptedEvidence.districtId, districtId)` predicate passed in as a parameter, not through a scoped repository or a policy object. The correctness of that scoping therefore depends entirely on every caller supplying the right `districtId`. Both in-scope evaluators take `districtId` only indirectly (via the snapshot), so within this phase's scope the scoping is consistently applied — but the enforcement mechanism is a convention, which is L6's ADR-0006 territory, not L3's.
2. **ADR-0001 (hexagonal structure).** Both evaluators are classes holding an injected `AiGatewayPort` (`topic-projection-evaluator.ts:275-280`, `topic-matching-evaluator.ts:278-283`) and are instantiated only in `apps/backend/src/entrypoints/worker.ts:180-181`. Whether the class shape itself honours or strains the hexagonal boundary is an L6 question; within L3 the port injection reads as correct.
3. **ADR-0008 (compose/Caddy edge).** Not examined. No in-scope content touches it.
4. Related to finding L3-P05-02: the gateway's hard-coded normalizer is also evidence about provider-neutrality, which is ADR-0005 rather than one of my two assigned ADRs. I have filed it under `hidden-dependency` and deliberately not as an `adr-conflict`.

## Residual uncertainty

1. **L3-P05-01 (anchor index) — could not be confirmed by execution.** No test suite was run (brief forbids it). The defect is established by reading two literal expressions against each other (`targetEvidence.slice(-15)` at `topic-projection-evaluator.ts:318` versus `targetEvidence[data.anchor_evidence_index - 1]` at `topic-projection-evaluator.ts:453`), which is why it is marked `observed` rather than `inferred`. What execution *would* settle is whether the model, in practice, emits `anchor_evidence_index` or `anchor_evidence_id`: the existing truncation test at `apps/backend/tests/topic-projection-evaluator.test.ts:752-753` only asserts prompt text (`Evidence #15` present, `Evidence #16` absent) and does not assert that the resolved anchor matches the labelled item. Note also that the exact-id tier (1b) and the Levenshtein tier (1c) run only when the index tier did not resolve, so a model that always returns a correct id would mask this. A test constructing a >15-evidence Topic and asserting `result.anchorEvidenceId ===` the item labelled `Evidence #1` would settle it definitively.

2. **L3-P05-04 (`profileId`) — the reconciliation path is the open question.** I marked the unused-pin claim `observed` for the call sites and `inferred` for "unused in production", because I read only the two production callers found by grep (`topic-assignment-coordinator.ts:261`, `topic-projection-job-handler.ts:153`). There may be a non-`src` or dynamically-dispatched caller I did not find. `apps/backend/tests/topic-projection-reconciliation.test.ts` exists and exercises the evaluator directly; I read its existence but not its body. Reading that test, plus the reconciliation service that schedules it, would determine whether the pin is intentional pre-positioning (in which case the finding is "document it") or dead interface surface ("remove it").

3. **L3-P05-03 (prompt duplication) — the extracted-fragments fix is not risk-free.** Both prompts contain long lists of exact Uzbek Cyrillic template strings that the guardrails and tests key on (e.g. the filler regex at `topic-projection-evaluator.ts:548-549` must keep matching the forbidden phrases the prompt forbids). A mechanical extraction could change whitespace or line breaks inside the rendered prompt and alter model behaviour in ways no test here would catch. I did not attempt to quantify how the models respond to prompt restructuring; that needs an evaluation harness, not a reading. Marked `worth-exploring` rather than `strong` for that reason.

4. **Not examined at all.** The DB schema and migrations for `topics` / `topic_projections` / `ai_operations`; the reconciliation service (`topic-reconciliation-service.ts`) beyond its import line in the job handler; the dashboard rendering of Lanes; and the `docs/architecture-review/` directory (intentionally withheld). Nothing about those affects the findings above, but a reviewer should know the boundary.

5. **No blockers for a later phase.** Findings L3-P05-01 and L3-P05-02 are both independently actionable: neither requires a decision from another phase's artifact, and neither depends on resolving the other. A later phase revisiting the AI gateway should treat L3-P05-02 as an input; a later phase auditing Audit-Record provenance should treat L3-P05-01 as an input.


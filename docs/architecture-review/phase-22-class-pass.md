# L3/L2 - Phase 22: the gate-recommended class pass (dead refinements behind tolerance preprocesses)

**Date:** 2026-09-24 - **Baseline:** HEAD 99c0f84 - **Scope:** the `L3-P05-02` class through L3 `ai` and L2 `ai-providers`, as the gate recommended (`INDEX.md:250,281`).
**Status:** ANALYSIS ONLY. Not authorised. Findings only; no fix, no schedule.

## 0. What the gate actually asked for, and one correction

The gate's recommendation reads: *"follow the producer/consumer key-domain-mismatch class through L3 `ai` / L2 `ai-providers`"*, pointing at `L3-P05-02` ("gateway rewrites evaluator payloads before `safeParse`").

**Correction: `L3-P05-02` was already fixed** in `fix-ledger.md` **Phase 5** (line 152). The gateway no longer rewrites caller-owned fields; `ai-gateway.ts:231-236` validates exactly what the model returned, and the comment at `:233-235` states the policy. So this pass could not be "finish `L3-P05-02`" - it had to be "did the *class* generalise, and is anything still live?"

**Answer: yes, and yes.** The class is: *a tolerance `z.preprocess` writes exactly the field a sibling `.refine` then verifies, making that refine clause unreachable.* Phase 5 removed the gateway-level instance and Phase 7 removed one evaluator-level instance (`topic-projection-evaluator.ts`). **Two instances remain live.**

## 1. The class, stated precisely

The pattern requires three parts:

1. A `z.preprocess` that **coerces a caller-relevant field into a consistent shape**.
2. A `.refine` on the same schema that **asserts that same consistency** as its contract.
3. The preprocess running first, so the refine's condition is satisfied by construction.

The refine still reads as live validation, so a future reader trusts it. It cannot fail on the path the preprocess covers. Phase 7 named this a **tautology** when it removed the `is_hokim_related` instance.

---

## 2. Findings

### L3-P22-01 - the topic-matching refine is defeated by its own preprocess

- **Path:** `apps/backend/src/modules/topics/topic-matching-evaluator.ts:28-80` (preprocess), `:110-133` (refine) - **Severity:** `low` - **Class:** `latent` - **Verification:** `observed`
- **Evidence.** The preprocess at `:70-77` enforces the decision-implied shape **before** the refine sees it:

```js
if (copy.decision === 'MATCH_EXISTING_TOPIC') {
  copy.primary_lane = null;
} else if (copy.decision === 'NEW_TOPIC') {
  copy.matched_topic_id = null;
} else if (copy.decision === 'UNASSIGNABLE_VAGUE') {
  copy.matched_topic_id = null;
  copy.primary_lane = null;
}
```

The refine at `:110-133` then asserts those very equalities:

```js
if (data.decision === 'MATCH_EXISTING_TOPIC') return (hasId || hasIndex) && data.primary_lane === null;
if (data.decision === 'NEW_TOPIC')          return noId && noIndex && data.primary_lane !== null;
if (data.decision === 'UNASSIGNABLE_VAGUE') return noId && noIndex && data.primary_lane === null;
```

**Which clauses are dead — measured, not asserted.** The preprocess writes `primary_lane` and `matched_topic_id`; it does **not** write `matched_topic_index` or `primary_lane`'s non-null case. Tracing each of the refine's seven conditions:

| Refine clause | Written by preprocess? | Verdict |
|---|---|---|
| `MATCH_EXISTING_TOPIC`: `data.primary_lane === null` | yes (`:71`) | **dead** |
| `MATCH_EXISTING_TOPIC`: `hasId \|\| hasIndex` | no | live |
| `NEW_TOPIC`: `noId` | yes (`:73`) | **dead** |
| `NEW_TOPIC`: `noIndex` | no | live |
| `NEW_TOPIC`: `data.primary_lane !== null` | no | live |
| `UNASSIGNABLE_VAGUE`: `noId` | yes (`:75`) | **dead** |
| `UNASSIGNABLE_VAGUE`: `data.primary_lane === null` | yes (`:76`) | **dead** |

**4 of 7 conditions cannot fail.** The refine is still partly live (`hasId \|\| hasIndex`, `noIndex`, `primary_lane !== null`), so this is a **partial** tautology, not a total one like Phase 7's.


- **Consequence.** primary_lane and matched_topic_id are the fields whose shape the decision determines, yet the refine documenting that contract cannot enforce it. A model returning NEW_TOPIC with a populated matched_topic_id is silently coerced to null rather than rejected.
- **The tolerance is deliberate** - the preprocess comment at :66-69 records that the model routinely echoes inadmissible fields and the coercion keeps the refine satisfiable. The defect is that the comment calls the refine the contract when the preprocess already removed four of its seven conditions.
- **Why low, not medium.** Honest tolerance with misleading documentation, not a wrong result. I first filed this medium/correctness and downgraded it after tracing the clauses: the refine is partially live, so nothing is accepted undetected except in the four conditions listed.
- **Fix direction.** Either drop the four dead clauses and keep the live three, noting the preprocess owns the rest, or move the coercion to a transform after a strict refine so the refine genuinely validates model output. The second is more faithful to the comment intent.

### L3-P22-02 - the semantic-relevance refine is half-dead for the same reason

- **Path:** apps/backend/src/modules/ai/semantic-relevance-evaluator.ts:29-78 - **Severity:** low - **Class:** latent - **Verification:** observed
- **Evidence.** The preprocess at :40-48 writes exactly the equalities the refine at :65-77 then asserts. Two of the refine four sub-conditions are written by the preprocess: exclusion_reason null when is_relevant is true (:41), and relevant_lanes empty when is_relevant is false (:47). The other two - lanes non-empty when true, and exclusion_reason non-null when false - are not written and stay live. Partial tautology, 2 of 4.
- **Why low.** Same shape as L3-P22-01. The comment at :34-36 is honest: it records that this coercion previously lived in the gateway and made the refine unreachable, and was moved here deliberately. The move fixed the location without fixing the reachability.

---

## 3. Found clean
- **The Phase 5 gateway fix holds.** ai-gateway.ts:231-236 validates exactly what the model returned and does not rewrite caller-owned fields; policy stated in-code at :233-235.
- The Phase 7 projection fix holds: is_hokim_related is derived in a transform after validation (topic-projection-evaluator.ts:140-143).
- No key-domain mismatch in L2 ai-providers: http-provider-adapter.ts reads payload.modelId, systemPrompt, userPrompt, temperature, maxOutputTokens, compiledSchema, timeoutMs, baseUrl and apiKey consistently across all four provider branches (OpenAI :27-47, DeepInfra :53-74, Gemini :81-123, Ollama :130-144). The gate hypothesis did not reproduce here.

## 4. Honest limitations

- This is a class pass, not an exhaustive AI-layer review. It traced the preprocess/refine pattern across all three tolerance sites and the provider boundary; it did not review the AI layer broadly.
- No code was changed. Nothing here is fixed.

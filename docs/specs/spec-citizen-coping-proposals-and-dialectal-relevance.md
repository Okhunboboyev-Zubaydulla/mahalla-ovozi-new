# Specification: Citizen Coping Proposals, Workarounds, and Dialectal Signal Ingestion

## Problem Statement

When municipal services (such as municipal waste collection, central water supply, power grid, or natural gas) become irregular, delayed, or absent, residents in neighborhood Telegram groups often stop posting routine schedule inquiries and instead voice their acute dissatisfaction through coping proposals, workaround ideas, and self-organization suggestions (e.g. proposing an informal communal dumpsite because the municipal truck schedule is erratic and citizens are tired of waiting anxiously).

Currently, the AI Semantic Relevance evaluator misclassifies these proposals as conversational banter (`GENERAL_CHATTER`), assuming they merely represent personal suggestions or community ideas rather than actionable municipal intelligence. Furthermore, when relevance-qualified proposals reach topic clustering, they risk being dismissed downstream as unassignable fragments because they lack traditional subject-predicate outage phrasing.

Additionally, deterministic qualification fast-fail guards preemptively discard genuine civic signals replying to non-civic messages whenever regional dialectal spellings (such as `мусир` instead of `мусор`, or temporal predicates like `кемаганига`) are used, preventing the AI evaluator from ever inspecting acute communal crises.

As a result, the District Hokim experiences critical blind spots on the executive dashboard during emerging municipal delivery breakdowns.

---

## Solution

1. **Causal Presupposition of Municipal Breakdown**: Establish an architectural rule in Semantic Relevance evaluation that recognizes citizen coping proposals, workarounds, and self-organization initiatives as qualified civic signals across all four utility Lanes (Water, Electricity, Gas, Waste) if and only if their motivating premise explicitly asserts or inherently presupposes an active municipal service failure, breakdown, or prolonged delivery absence.
2. **Linguistic Verification Gates**: Enforce strict substance boundaries requiring the presence of comparative exasperation clauses (*"undan ko'ra..."*, *"o'rniga..."*), explicit delay/pain-point clauses (*"zato kutib o'tirmaymiz"*, *"charchadik kutib"*, *"suv yo'qligidan"*), or utility provider abandonment statements (*"vodokanaldan umid yo'q"*), while strictly excluding decorative proposals, private fund-raising, and wishlists as conversational banter.
3. **First-Class Topic Citizenry**: Update the Topic Assignment Engine to treat relevance-qualified coping proposals as first-class topic evidence capable of attaching to existing same-day Topics or seeding a new Topic in that Lane when no prior topic exists today, while strictly forbidding them from being marked as unassignable vague fragments.
4. **Dialectal Heuristic Hardening**: Expand the deterministic qualification filters to recognize colloquial phonetic variants and regional inflectional suffixes so legitimate municipal evidence is never blocked from evaluation.

---

## User Stories

1. As a District Hokim, I want the system to detect when residents propose informal communal waste points due to missed garbage trucks, so that I am immediately alerted to municipal waste collection route failures in that Mahalla.
2. As a District Hokim, I want the system to capture resident proposals to install private water pumps or lay neighborhood pipes due to dry taps, so that I can see the acute failure of the municipal water supply network.
3. As a District Hokim, I want the system to capture resident discussions on purchasing shared generators or transformers out of despair over persistent blackouts, so that I can identify severe electricity grid instability.
4. As a District Hokim, I want the system to identify resident self-help fuel preparations (e.g. buying coal or firewood) motivated by gas delivery abandonment, so that I know central gas delivery has failed in that sector.
5. As a District Hokim, I want abstract neighborhood wishlists (such as planting trees or building gazebos) to be excluded from the dashboard, so that executive attention is not distracted by conversational chatter.
6. As a District Hokim, I want private road closure or gate proposals to be filtered out unless explicitly directed to the Hokimiyat, so that private neighborhood security discussions do not pollute municipal infrastructure signals.
7. As a District Hokim, I want coping proposals to seed a new Topic if no prior topic exists in that Lane today, so that early-morning service failures are not lost simply because citizens voiced a workaround before filing a traditional complaint.
8. As a District Hokim, I want coping proposals to merge into an existing active Topic when one already exists today, so that all related evidence for a single communal situation remains clustered together.
9. As a District Hokim, I want multi-message bursts expressing a unified coping suggestion to have all constituent thought clauses preserved as Accepted Evidence, so that the full real-world context is visible during review.
10. As a District Hokim, I want citizen replies using regional Uzbek Cyrillic or Latin dialect terms (such as `мусир` or `musr`) to be fully evaluated, so that municipal signals from non-standard regional speakers are not silently dropped.
11. As a District Hokim, I want citizen reports describing accumulated roadside waste (e.g. `кўчада роса ётибди мусорлар`) to qualify as high-confidence Waste evidence, so that street litter hazards are brought to light.
12. As a District Hokim, I want citizen reports citing elapsed service duration (e.g. `3 ҳафта бўлди келмаганига`) to reliably qualify as active route service failures, so that prolonged vendor neglect is exposed.
13. As a Product Owner, I want the AI relevance evaluator to provide clear, human-readable reasoning explaining why a proposal qualified as a municipal failure workaround, so that audit logs remain transparent and verifiable.
14. As a Product Owner, I want topic summaries generated from coping proposals to reflect the underlying municipal failure (e.g. collection route disruption) rather than citizen self-help phrasing, so that executive situational awareness is accurate.
15. As a Product Owner, I want deterministic qualification fast-fail guards to remain fast and computationally cheap without generating false-negative drops, so that system throughput remains high while preserving signal integrity.

---

## Implementation Decisions

### Semantic Relevance Engine
- Introduce a dedicated specification section for **Citizen Coping Proposals & Workarounds** into the Semantic Relevance system rules across the four municipal infrastructure Lanes (Water, Electricity, Gas, Waste).
- Establish that while pure suggestions are non-civic chatter, proposals motivated by an underlying municipal failure possess high civic relevance.
- Define explicit qualification criteria: the proposal must incorporate either a comparative exasperation marker, an explicit pain-point/delay clause, or a provider abandonment clause.
- Define explicit exclusion boundaries: proposals regarding purely private household appliances, community social fundraising, general street paving without Hokim appeals, or decorative ideas without an active utility failure must be assigned to general chatter.
- Ensure that in multi-message bursts, all constituent clauses articulating the proposal, logistics, and underlying grievance rationale are accepted together as evidence.

### Topic Assignment Engine
- Introduce a dedicated guidance rule in the Topic Assignment Engine for **Coping Proposals and Self-Help Workarounds**.
- Specify that relevance-qualified coping proposals must be clustered into an existing same-day Topic within the matching Lane, or seed a new Topic in that Lane if no prior topic exists today.
- Explicitly prohibit designating relevance-qualified coping proposals as unassignable vague fragments when they lack traditional bipartite subject-predicate grammar, provided they carry an upstream municipal Lane qualification.

### Telegram Intake Qualification Module
- Expand the deterministic subject recognition patterns to include regional phonetic and colloquial variants for municipal waste (including Latin and Cyrillic forms such as `musr`, `musir`, `мусир`, `мусирлар`).
- Expand the deterministic failure predicate patterns to recognize accumulation verbs (e.g. `йотибди`, `yotibdi`) and elapsed non-arrival participle suffixes (e.g. `кемаганига`, `kelmaganiga`, `кемибди`).
- Ensure these expanded patterns integrate with compound term matchers and subject-predicate conjunction rules without degrading evaluation speed.

---

## Testing Decisions

### Test Philosophy
Tests must exercise external behavioral boundaries and system contracts rather than internal implementation mechanics. Tests should verify that realistic colloquial citizen messages produce deterministic qualification, correct AI semantic classification, appropriate lane assignment, and proper topic clustering or seeding.

### Tested Modules & Highest Seams
1. **End-to-End Worker Pipeline (Highest Seam)**:
   - Exercise the full asynchronous intake-to-topic pipeline using test job queues and isolated PostgreSQL test database instances.
   - Verify that an intake record containing a multi-message coping proposal burst transitions to accepted evidence and creates or attaches to a Topic.
   - Verify that an intake record containing a dialectal waste complaint replying to an excluded message bypasses fast-fail and successfully qualifies.
2. **Semantic Relevance Evaluator Seam**:
   - Provide structured input fixtures representing coping proposals across Water, Electricity, Gas, and Waste.
   - Verify relevance boolean output, qualifying lane array, and multi-message accepted ID retention.
   - Provide counter-fixtures (wishlists, private domestic suggestions, general road ideas) and verify strict exclusion as general chatter.
3. **Topic Assignment Evaluator Seam**:
   - Verify that a qualified coping proposal seeds a new Topic when the snapshot contains zero active topics.
   - Verify that a qualified coping proposal merges into an active Topic when one exists in the same Lane.
   - Verify that unassignable vague fragment errors are never produced for valid coping proposals.
4. **Deterministic Qualification Seam**:
   - Unit-test text qualification predicates with diverse regional dialectal phrases, verify positive detection on dialectal waste terms and elapsed non-arrival forms, and verify negative detection on conversational non-civic replies.

### Prior Art
- Existing test suites in the test directory (`tests/semantic-relevance-evaluator.test.ts`, `tests/topic-matching-evaluator.test.ts`, `tests/worker-semantic-relevance.test.ts`, and `tests/telegram-content-qualification.test.ts`) serve as the structural pattern and assertion baseline.

---

## Out of Scope

- Modifying the web user interface or Hokim dashboard components.
- Modifying the Hokim-related lane аппаратус definitions or apparatus keywords.
- Expanding automatic topic creation to non-municipal domains (e.g. private neighborhood security gates, commercial initiatives).
- Automatic response generation or outbound messaging to Telegram groups (Mahalla Ovozi remains strictly read-only for citizen groups).

---

## Further Notes

- All automated test executions must run exclusively against the isolated test database `mahalla_ovozi_test` (port 5433) and never touch the live development or production databases.
- Following verification of the codebase, production remediation scripts will be executed to re-process September 15 intake records for Navbahor (messages 438–443) and Navro'z (message 66410) on the production deployment.

## Epic 2: Authorized Telegram Signals Become Traceable Topics

An activated District can passively receive authorized Telegram messages and reliably turn qualifying evidence into cautious, same-day canonical Topics with complete traceability.

### Story 2.1: Durably Receive Authorized District Telegram Messages

As the **Product Owner**,
I want each activated District's Telegram bot to receive messages only from that District's approved groups and hand authorized intake off durably,
So that downstream signal processing begins from isolated, traceable, retry-safe Telegram input.

**Acceptance Criteria:**

**Given** a District is Active, its Telegram bot is valid, and the source Telegram group has an approved one-to-one mapping to a Mahalla in that District
**When** Telegram delivers a message update through that District's bot
**Then** the application resolves the District and Mahalla from authoritative server-side configuration
**And** the intake is explicitly scoped to that District
**And** no client- or Telegram-supplied District identifier is trusted as authorization evidence.

**Given** an update arrives through a District bot
**When** its source group is not currently approved for that same District, belongs to another District, or has no valid Mahalla mapping
**Then** the message does not enter production processing
**And** no AI operation or downstream processing job is created from it
**And** its resident message content is not retained as production evidence or routine diagnostic data
**And** another District's configuration can never authorize it.

**Given** the District is not Active at the time intake is evaluated
**When** Telegram delivers an update
**Then** production intake and downstream processing do not begin
**And** no later worker may bypass that lifecycle decision merely because an earlier job or request existed.

**Given** an authorized update is eligible for production intake
**When** the webhook handler accepts it
**Then** the authorized intake state and its required asynchronous processing work are made durable in PostgreSQL/pg-boss before Telegram receives a successful acknowledgement
**And** persistence and consequential job creation are atomic wherever both are required for correctness
**And** a persistence or enqueue failure cannot be reported as successful durable intake.

**Given** the same Telegram update or message is delivered more than once because of retry, redelivery, or concurrent webhook handling
**When** intake is processed repeatedly
**Then** all deliveries resolve to one logical intake item and one required downstream business effect
**And** duplicate delivery cannot create duplicate retained candidate state or duplicate consequential processing
**And** incomplete work remains retryable without replaying already-completed intake effects.

**Given** an authorized message is durably captured for later processing
**When** its processing is delayed or retried
**Then** the originally received Telegram message identifiers, original Telegram timestamp, source group, resolved District, and resolved Mahalla remain stable
**And** the Uzbekistan calendar day used for ordering-sensitive processing is derived from the original Telegram timestamp in `Asia/Tashkent`, not from retry or worker execution time.

**Given** multiple authorized messages for the same District, Mahalla, and Uzbekistan calendar day may be processed concurrently
**When** downstream work is scheduled
**Then** ordering-sensitive processing is coordinated using the stable District + Mahalla + day scope
**And** source ordering can later be resolved deterministically without depending on worker arrival order
**And** unrelated scopes remain free to process concurrently.

**Given** intake succeeds, is rejected, duplicated, delayed, or fails durably
**When** routine logs, metrics, or traces are emitted
**Then** they contain sufficient privacy-safe operational metadata to measure intake count, duplicate handling, persistence failures, and webhook durability latency
**And** raw Telegram message content, bot tokens, AI context, credentials, and other secrets are absent from routine telemetry and audit payloads.

**Given** Story 2.1 is verified
**When** focused automated and production-shaped checks run
**Then** integration tests cover Active approved-group intake, inactive-District rejection, unapproved-group rejection, cross-District rejection, durable job handoff, transaction failure, duplicate/redelivery behavior, retry stability, original-timestamp preservation, and District/Mahalla/day isolation
**And** tests prove this story makes no AI relevance or Topic decision yet
**And** webhook durability is verified against the approved NFR3 target of successful authorized persistence below one second for at least 95% of normal/burst traffic at the MVP envelope.

### Story 2.2: Admit Supported Telegram Content and Discard Structural Exclusions

As the **Product Owner**,
I want authorized Telegram intake to admit only supported human text or textual captions and discard structurally unsupported content before AI,
So that AI analysis receives only valid candidate content and excluded Telegram content is not retained for later reassessment.

**Acceptance Criteria:**

**Given** an authorized intake item from Story 2.1 contains a human-authored text message
**When** structural content qualification runs
**Then** its original text is admitted as a supported candidate for subsequent semantic analysis
**And** its original Telegram timestamp, message identifiers, District, Mahalla, source group, and required message relationship metadata remain associated with the candidate
**And** the text is preserved verbatim without translation, normalization, summarization, or rewriting.

**Given** an authorized Telegram message contains media with a non-empty textual caption
**When** structural content qualification runs
**Then** the textual caption can be admitted as the candidate content
**And** the caption remains verbatim in its original language, script, and line structure
**And** media bytes, OCR output, audio transcription, document contents, and other attachment contents are not downloaded or introduced into AI context by this capability.

**Given** an authorized Telegram update contains a command, bot-authored message, empty supported content, captionless media, audio-only content, document/file content without a supported textual caption, or another unsupported content type
**When** structural content qualification runs
**Then** it is excluded before any AI operation is created or invoked
**And** it cannot become Accepted Evidence or seed/update a Topic
**And** its raw resident content is discarded after the structural outcome is completed.

**Given** Telegram marks a message as forwarded using Telegram-provided forwarding metadata
**When** structural qualification evaluates it
**Then** the message is excluded before AI regardless of the apparent meaning of its text or caption
**And** configured vocabulary or keywords cannot override the exclusion
**And** the forwarded message content is not retained for future production reassessment.

**Given** a non-forwarded message directly replies to a Telegram-marked forwarded message
**When** the reply itself contains structurally supported human text or a textual caption
**Then** the reply may continue as its own candidate for later semantic analysis
**And** the forwarded parent remains excluded
**And** the forwarded parent's content is not fetched, retained, or supplied as candidate context
**And** the later semantic decision must determine whether the reply is sufficiently self-contained to qualify.

**Given** a structurally excluded message has completed its structural decision
**When** the same Telegram delivery is retried, redelivered, or processed concurrently
**Then** it remains one completed structural outcome
**And** duplicate handling does not invoke AI or recreate discarded resident content
**And** any minimal state retained solely for duplicate-safe processing contains no discarded raw message/caption content.

**Given** a candidate was authorized and attributed to its District and Mahalla when durably received in Story 2.1
**When** structural processing occurs later
**Then** it uses that captured District/Mahalla/source attribution rather than silently remapping the historical intake item from a later configuration change
**And** future-only mapping changes affect only subsequent intake
**And** current District lifecycle eligibility is still rechecked where required before later AI side effects.

**Given** structurally supported content passes this story's qualification
**When** it is handed to the next processing stage
**Then** no relevance, Lane, Topic membership, Topic creation, summary, or other AI-derived success has yet been asserted
**And** configured multilingual recognition vocabulary has not been used as a deterministic structural admission/rejection rule.

**Given** structural processing succeeds, excludes content, retries, or fails
**When** operational telemetry is emitted
**Then** privacy-safe metrics/logs can distinguish supported candidates, structural exclusion categories, retries, failures, and processing latency
**And** raw Telegram content, discarded captions, attachment contents, bot tokens, credentials, and secrets do not enter routine logs, metrics, traces, or Audit History.

**Given** structural processing encounters malformed or insufficient Telegram metadata such that the required content/origin/forwarding decision cannot be made safely
**When** qualification cannot establish a valid supported candidate
**Then** the system does not guess or send the message to AI
**And** processing fails or excludes it through an explicit safe outcome as appropriate
**And** no partial candidate or Accepted Evidence state is committed.

**Given** Story 2.2 is verified
**When** focused automated checks run
**Then** integration tests cover supported human text, textual captions, commands, bot messages, empty content, captionless media, audio, documents/file contents, Telegram-marked forwards, non-forwarded replies to forwarded parents, malformed metadata, duplicates, and delayed processing
**And** tests prove structural exclusions never invoke the AI gateway
**And** tests prove excluded raw content is not retained for future reassessment and supported content reaches the next stage verbatim with its original captured scope and Telegram metadata.

### Story 2.3: Decide Semantic Relevance by Meaning and Discard Non-Qualifying Content

As the **Hokim**,
I want structurally supported Telegram messages to be judged by their meaning rather than by keyword matching,
So that genuinely relevant District signals continue toward Topics while irrelevant group content is discarded.

**Acceptance Criteria:**

**Given** a structurally supported candidate from Story 2.2
**When** semantic relevance analysis runs
**Then** the decision is made through the project-owned AI gateway using meaning analysis
**And** the candidate's original text or caption remains verbatim
**And** deterministic District, Mahalla, lifecycle, authorization, retention, and Telegram-forwarding rules remain outside AI control.

**Given** configured District recognition vocabulary contains Uzbek or Russian, Latin or Cyrillic forms, jargon, abbreviations, common typos, or informal terms
**When** relevance is evaluated
**Then** that vocabulary is supplied only as guidance to semantic analysis
**And** presence of a configured term cannot by itself force a candidate to qualify
**And** absence of a configured term cannot by itself prevent a candidate from qualifying.

**Given** a candidate clearly reports a supported Water, Electricity, Gas, or Waste situation, complaint, or another qualifying signal
**When** its meaning satisfies the approved relevance rules
**Then** it receives a completed `relevant` semantic decision
**And** it may continue as a relevance-qualified candidate toward same-day Topic assignment
**And** it is not yet treated as Accepted Evidence or a Topic merely because relevance succeeded.

**Given** a candidate directly and meaningfully concerns the Hokim or District leadership
**When** relevance is evaluated
**Then** a direct configured Hokim reference or clear semantic leadership reference can qualify
**And** a non-service complaint such as a road problem can qualify for later Hokim-related handling when that connection is clear
**And** a vague expression such as “responsible people” does not qualify merely by implication when no reliable connecting context exists.

**Given** semantic interpretation requires same-day Mahalla context to resolve an otherwise ambiguous candidate
**When** the contextual relevance operation is prepared
**Then** its canonical input contains the candidate plus all raw Accepted Evidence from every same-day Topic in that Mahalla
**And** evidence is ordered deterministically by original Telegram timestamp, then Telegram message ID, then internal evidence ID
**And** RAG, vector retrieval, summaries, recent-message windows, cross-day memory, or top-K selection do not replace that required context
**And** required older same-day evidence is never silently truncated.

**Given** a non-forwarded reply to a Telegram-marked forwarded parent passed Story 2.2's structural boundary
**When** semantic analysis determines whether that reply can proceed
**Then** the reply must contain a sufficiently self-contained qualifying signal
**And** the excluded forwarded parent is never supplied as context
**And** a reply that depends on the forwarded parent for its meaning is excluded rather than guessed or reconstructed.

**Given** a candidate is a planned announcement, advertisement, pure speculation, neutral Hokim mention, praise, or other non-qualifying content
**When** it contains no independently qualifying reported situation, complaint, or meaningful Hokim-related concern
**Then** the completed semantic decision is `irrelevant`
**And** it does not become Accepted Evidence or proceed to Topic processing
**And** its resident raw content is discarded after the completed decision
**And** it is not retained for later automatic reconsideration.

**Given** a candidate is semantically excluded
**When** Telegram later redelivers the same message or a worker restarts
**Then** the completed decision is not replayed merely because of redelivery or restart
**And** discarded raw content is not reconstructed
**And** only minimal content-free state required for duplicate/idempotency handling may remain.

**Given** a logical semantic-relevance operation is created
**When** it invokes an AI provider
**Then** it pins the exact immutable AI profile/configuration version used for that logical operation
**And** provider calls occur outside database transactions
**And** retries of that unfinished logical operation retain the pinned profile
**And** later configuration activation does not replay an already-completed historical relevance decision.

**Given** contextual relevance analysis captured a Mahalla/day `contextRevision` and snapshot fingerprint
**When** Accepted Evidence changes before the AI result can commit
**Then** the stale result is rejected as `STALE_SNAPSHOT`
**And** no relevance result or other AI-derived state from that stale snapshot is committed
**And** only the unfinished candidate may retry against the newest complete deterministic context
**And** already-completed historical message decisions are not replayed merely because context advanced.

**Given** the provider refuses, times out, is rate-limited, fails, returns structurally invalid output, returns semantically invalid output, or complete required context exceeds the approved limit
**When** semantic relevance processing cannot produce a valid result
**Then** the outcome remains an explicit failure rather than being converted to `irrelevant` or `relevant`
**And** no partial relevance success is committed
**And** the candidate remains only as required for duplicate-safe retry of incomplete work
**And** the exact logical operation/profile and privacy-safe failure category remain traceable for later operational investigation.

**Given** relevance processing succeeds, excludes content, retries, becomes stale, or fails
**When** routine observability data is emitted
**Then** metrics/logs/traces can distinguish relevance outcomes, retries, stale snapshots, context size, latency, and sanitized AI failure categories
**And** raw Telegram candidate content, complete AI context, bot tokens, credentials, prompts containing resident evidence, and secrets are absent from routine telemetry and Audit History.

**Given** semantic relevance work was durably accepted earlier
**When** a provider call or authoritative semantic-result commit is about to occur
**Then** the current District lifecycle and subject eligibility are rechecked
**And** an ineligible District or subject receives no new AI side effect or semantic business commit
**And** previously completed historical decisions remain unchanged.

**Given** a contextual relevance operation runs before any Accepted Evidence exists for that Mahalla/day
**When** its canonical context is constructed
**Then** the complete context consists of the candidate plus the empty Accepted Evidence set
**And** a self-contained candidate can still be evaluated normally.

**Given** an incomplete relevance operation has exhausted the retry policy pinned to its logical AI operation or otherwise becomes permanently non-retryable
**When** its terminal outcome is recorded
**Then** it cannot remain indefinitely pending
**And** raw candidate content retained solely for retry is disposed of once no approved processing purpose remains
**And** only approved privacy-safe operational lineage may remain.

**Given** Story 2.3 is verified
**When** focused automated checks run
**Then** tests cover meaning-based qualification with and without configured vocabulary, qualifying Hokim references, vague leadership references, service and non-service examples, announcements/advertisements/speculation/praise exclusions, self-contained replies to forwarded parents, contextual relevance with complete same-day evidence, deterministic ordering, context overflow, provider/refusal/timeout/rate-limit/invalid-output failures, stale-snapshot rejection, duplicate delivery, retry, and completed-decision non-replay
**And** tests prove an irrelevant decision disposes of resident raw content
**And** tests prove this story does not yet create Accepted Evidence, assign Topic membership, create a Topic, or derive Lane/summary state.

### Story 2.4: Assign Relevant Signals to Same-Day Topics and Commit Accepted Evidence

As the **Hokim**,
I want each relevance-qualified Telegram signal to become Accepted Evidence only when it can be reliably assigned to the correct same-day Topic or safely start a new one,
So that District Topics remain traceable, day-bounded, and free from guessed evidence relationships.

**Acceptance Criteria:**

**Given** a candidate has a completed `relevant` decision from Story 2.3
**When** Topic assignment begins
**Then** its authoritative scope is the captured District, captured Mahalla, and `Asia/Tashkent` calendar day derived from the original Telegram timestamp
**And** Topic assignment never crosses District, Mahalla, or midnight boundaries
**And** current District lifecycle eligibility is rechecked before any new AI side effect.

**Given** the relevant candidate directly replies to a Telegram message that already exists as Accepted Evidence in the same District, Mahalla, and calendar day
**When** Topic membership is resolved
**Then** the direct Telegram reply relationship takes priority
**And** the candidate is assigned to that evidence item's canonical Topic
**And** the system does not choose a different Topic merely because another semantic match appears plausible.

**Given** a direct reply target belongs to another District, another Mahalla, another calendar day, was structurally excluded, was discarded, or is otherwise not eligible Accepted Evidence
**When** Topic assignment evaluates the reply relationship
**Then** that relationship cannot create a Topic link
**And** no cross-scope or cross-day exception is created
**And** the candidate continues only through the safe same-day fallback rules applicable to its own captured scope.

**Given** no valid direct-reply Topic relationship exists
**When** a same-day Topic-matching decision is required
**Then** only the nearest earlier same-day Topic-linked message in deterministic source order is eligible as the fallback relationship target
**And** the candidate plus all raw Accepted Evidence from every same-day Topic in the same Mahalla is supplied as the complete contextual AI snapshot
**And** the complete context is used to determine whether the candidate and eligible earlier message concern the same underlying situation
**And** the system does not search arbitrary older Topics for a more convenient match.

**Given** the eligible nearest earlier Topic-linked message concerns the same underlying situation
**When** the validated matching result commits successfully
**Then** the candidate is assigned to that existing canonical Topic
**And** no second Topic is created for the same assignment
**And** time gaps, recurrence, restoration reports, or contradictory reports do not by themselves force a new Topic when they clearly concern the same situation.

**Given** the candidate does not reliably belong to an existing same-day Topic
**And** the candidate itself is sufficiently self-contained to establish an underlying situation
**When** Topic assignment completes
**Then** one new canonical Topic is created for that District + Mahalla + calendar day + situation
**And** the candidate becomes the first Accepted Evidence for that Topic
**And** the Topic receives an opaque identity that is independent of any future Lane membership.

**Given** a relevant candidate is vague or context-dependent
**And** it has neither a valid direct-reply Topic relationship nor a reliable nearest-earlier same-day match
**When** assignment cannot establish Topic membership safely
**Then** the system does not guess
**And** the candidate does not create a new Topic
**And** it does not become Accepted Evidence
**And** its resident raw content is discarded after the completed non-acceptance outcome rather than being retained for future reassessment.

**Given** a candidate is accepted into an existing or newly created Topic
**When** the authoritative commit occurs
**Then** Topic assignment and creation of the single Accepted Evidence record are committed atomically where required for correctness
**And** Accepted Evidence preserves the original text/caption verbatim, original Telegram timestamp, message identifier, captured source group, District, Mahalla, and permitted Telegram identity metadata
**And** username is retained when available, otherwise display name may be retained
**And** no phone number is inferred.

**Given** Accepted Evidence has been committed
**When** Telegram later edits or deletes the original message
**Then** the captured Accepted Evidence is not rewritten by the edit
**And** Telegram deletion does not remove it before its Topic retention boundary
**And** the originally captured Telegram timestamp remains authoritative.

**Given** Accepted Evidence changes canonical same-day Mahalla AI-input state
**When** it is committed
**Then** the Mahalla/day `contextRevision` advances atomically with that canonical state change
**And** the deterministic evidence order remains original Telegram timestamp, Telegram message ID, then internal evidence ID
**And** only the affected Topic is marked as requiring a later derived-projection refresh
**And** no Topic summary, Lane membership, anchor, or other derived projection is asserted by this story.

**Given** a Topic receives Accepted Evidence
**When** its retention metadata is derived
**Then** its latest-relevant-evidence timestamp reflects the latest original Telegram timestamp among its Accepted Evidence
**And** its Topic-level retention boundary is 90 days after that timestamp
**And** individual Accepted Evidence is not assigned an earlier independent expiry while the Topic remains retained.

**Given** Topic matching requires a contextual AI operation
**When** its canonical snapshot is constructed
**Then** the operation captures the current `contextRevision`, deterministic fingerprint, serializer version, and immutable AI profile version
**And** the provider call occurs outside database transactions
**And** RAG, vectors, summaries, recent windows, cross-day context, or silent truncation never replace the complete required same-day snapshot.

**Given** canonical AI-input state changes while Topic matching is in flight
**When** the matching result attempts to commit against an obsolete `contextRevision`
**Then** it fails as `STALE_SNAPSHOT`
**And** neither Topic membership nor Accepted Evidence from that stale operation is committed
**And** the unfinished assignment may retry using the newest complete snapshot
**And** Story 2.3's already-completed relevance decision is not replayed merely because context advanced.

**Given** complete context exceeds the approved provider/request limit, or the matching operation encounters refusal, timeout, rate limit, provider failure, structurally invalid output, or semantically invalid output
**When** no valid reliable Topic-assignment result exists
**Then** the operation remains an explicit failure
**And** the system does not use failure as justification to attach the candidate or seed a new Topic
**And** no partial Accepted Evidence or Topic state is committed
**And** incomplete work remains duplicate-safe and retryable.

**Given** the same Telegram message is redelivered, retried, or processed concurrently
**When** Topic/evidence processing repeats
**Then** at most one Accepted Evidence record can exist for that Telegram message in its captured District scope
**And** one completed Topic-assignment result is preserved for the applicable processing decision
**And** an already-completed assignment is not replayed because of Telegram redelivery or worker restart.

**Given** relevant candidates for the same District, Mahalla, and calendar day are processed concurrently
**When** they can affect shared Topic/context state
**Then** stable scoped ordering coordination and authoritative uniqueness/idempotency boundaries prevent duplicate logical Topics or duplicate evidence effects
**And** queue ordering does not replace transaction, revision, or uniqueness correctness checks
**And** unrelated District/Mahalla/day scopes may process concurrently.

**Given** Topic assignment succeeds, rejects an unassignable candidate, retries, becomes stale, or fails
**When** routine observability is emitted
**Then** privacy-safe telemetry can distinguish assignment paths, new-versus-existing Topic outcomes, retries, stale snapshots, context size, processing latency, and sanitized failures
**And** raw evidence, candidate content, complete AI context, credentials, bot secrets, and provider payloads containing resident content remain outside routine logs, metrics, traces, and Audit History.

**Given** Story 2.4 is verified
**When** focused automated checks run
**Then** tests cover direct-reply priority, invalid/cross-day reply targets, nearest-earlier fallback matching, complete same-day context, existing-Topic assignment, independent self-contained Topic seeding, vague unassignable candidates, contradictory/restoration/recurrence evidence, original evidence-state preservation, duplicate/redelivery behavior, concurrent assignment, context revision advancement, stale-snapshot rejection, context overflow, provider failures, and 90-day retention metadata
**And** tests prove one candidate cannot create duplicate Accepted Evidence or duplicate logical Topic effects
**And** tests prove this story does not yet derive Topic summary, Lane membership, anchor, latest-activity projection, or Hokim-related projection.

### Story 2.5: Recalculate the Canonical Multi-Lane Topic Projection

As the **Hokim**,
I want each Topic to maintain one cautious derived representation across every applicable Lane,
So that I can later see a consistent summary of the situation without duplicate Topics or unsupported claims.

**Acceptance Criteria:**

**Given** a Topic has Accepted Evidence and `requiredDerivedGeneration` is greater than `appliedDerivedGeneration`
**When** derived refresh work is selected
**Then** the refresh targets that one canonical Topic
**And** current District lifecycle eligibility and target validity are rechecked before any AI side effect
**And** unrelated unchanged Topics are not scheduled merely because another Topic in the Mahalla changed.

**Given** a Topic-derived refresh requires contextual AI analysis
**When** its canonical snapshot is constructed
**Then** the target Topic is evaluated against all raw Accepted Evidence from every same-day Topic in the same Mahalla
**And** evidence is ordered deterministically by original Telegram timestamp, then Telegram message ID, then internal evidence ID
**And** the target Topic and its own Accepted Evidence are explicitly identifiable in the operation input
**And** RAG, vector retrieval, summaries, recent windows, top-K selection, cross-day memory, or silent truncation do not replace the complete required context.

**Given** a logical Topic-derived refresh operation is created
**When** it is prepared for the AI gateway
**Then** it captures the target `requiredDerivedGeneration`, current Mahalla/day `contextRevision`, deterministic snapshot fingerprint, serializer version, and immutable AI profile version
**And** the provider call occurs outside database transactions
**And** retries of the same unfinished logical operation remain pinned to that profile.

**Given** a validated Topic-derived projection is produced
**When** its complete projection is assembled
**Then** it contains the cautious Topic summary, Lane membership, anchor, latest meaningful activity, attribution, and Hokim-related status as one atomic derived representation
**And** no subset of those fields is independently treated as an authoritative partial success.

**Given** a Topic's Accepted Evidence supports multiple applicable concerns
**When** Lane membership is derived
**Then** the same canonical Topic may belong to every applicable Lane among `Ҳокимга оид`, `Сув`, `Электр`, `Газ`, and `Чиқинди`
**And** Lane membership never creates a second Topic identity or duplicate Accepted Evidence
**And** a Topic may be Hokim-only or may overlap Hokim-related with one or more service Lanes.

**Given** a Topic-derived projection is returned by AI
**When** semantic validation evaluates Lane membership
**Then** membership is a non-empty subset only of `Ҳокимга оид`, `Сув`, `Электр`, `Газ`, and `Чиқинди`
**And** an empty set, unknown Lane, invented category, or malformed membership is invalid output and commits nothing.

**Given** Accepted Evidence contains reports, claims, disagreement, contradiction, recurrence, restoration, or changing accounts
**When** the Topic summary is recalculated
**Then** the summary is concise Uzbek Cyrillic with cautious attribution
**And** resident statements remain reported information rather than verified facts
**And** disagreement, contradiction, recurrence, restoration, and materially changing reports are preserved rather than flattened into an unsupported single certainty.

**Given** Accepted Evidence reports that a service returned, a problem was fixed, or another outcome occurred
**When** the projection summarizes that evidence
**Then** the reported outcome may be described as reported
**And** it is not converted into a verified resolution, completion, or authoritative case state
**And** the projection does not invent Hokim acknowledgement, recommendations, urgency, sentiment, or required action.

**Given** a Topic has multiple Accepted Evidence items
**When** its anchor is derived
**Then** the anchor is the latest self-contained meaningful evidence for that Topic
**And** a newer vague fragment does not automatically replace a meaningful anchor
**And** claimed truth, claimed resolution, or newest timestamp alone is not sufficient to make an item the anchor.

**Given** a projection selects a Topic anchor or latest meaningful activity
**When** the projection is validated
**Then** the anchor references an existing Accepted Evidence item belonging to that target Topic
**And** latest meaningful activity resolves to an original Telegram timestamp of retained Accepted Evidence belonging to that target Topic
**And** evidence from another same-day Topic may aid contextual interpretation but cannot become the target Topic's anchor, activity source, or evidence.

**Given** latest meaningful activity is projected
**When** its timestamp is stored or exposed
**Then** it is traceable to retained Accepted Evidence's original Telegram timestamp
**And** retry time, worker time, AI completion time, Telegram edit time, or dashboard refresh time cannot become that activity timestamp.

**Given** attribution or Hokim-related meaning is derived
**When** same-day Mahalla context helps interpretation
**Then** the operation may use that context to disambiguate meaning
**And** it cannot invent people, organizations, authority relationships, phone numbers, or factual claims absent from retained evidence
**And** evidence belonging to another Topic never becomes Accepted Evidence for the target Topic.

**Given** new Accepted Evidence is committed to the target Topic while refresh work is pending or running
**When** the Topic's source state changes
**Then** `requiredDerivedGeneration` advances
**And** pending refresh work may coalesce to the newest required generation
**And** obsolete intermediate generations need not be computed
**And** no Accepted Evidence is dropped from the complete required refresh context.

**Given** generation N is in flight and source changes advance the Topic to generation N+1
**When** generation N attempts to commit
**Then** generation N cannot become the current projection
**And** the stale operation commits no derived fields or applied-generation advancement
**And** unfinished work converges toward the newest required generation.

**Given** the Mahalla/day `contextRevision` changes while Topic-derived AI work is in flight
**When** the result attempts to commit
**Then** the stale result commits no Topic-derived state
**And** the unfinished refresh retries against the newest complete context as permitted
**And** completed historical relevance or Topic-assignment decisions are not rerun.

**Given** the captured generation and `contextRevision` are still current
**And** the AI output passes both structural and operation-specific semantic validation
**When** the projection commits
**Then** the complete Topic-derived projection commits atomically
**And** `appliedDerivedGeneration` advances to the committed target generation
**And** the exact immutable AI profile/configuration lineage is recorded with the committed result.

**Given** Topic-derived refresh commits successfully
**When** its atomic projection is written
**Then** it may change only the approved derived projection fields and applied-generation state
**And** it cannot create, delete, or reassign Accepted Evidence
**And** it cannot change canonical Topic identity or Topic membership.

**Given** a newer approved AI configuration becomes active before a genuinely new source generation creates a new logical refresh operation
**When** that new logical refresh operation is created
**Then** it uses the then-active applicable immutable profile
**And** older committed projections remain traceable to their actual historical profile
**And** configuration activation alone does not replay completed historical message-level relevance or assignment decisions.

**Given** complete required context exceeds the approved request/provider limit, or the provider refuses, times out, is rate-limited, fails, or returns structurally or semantically invalid output
**When** Topic-derived refresh cannot produce a valid complete projection
**Then** the outcome remains an explicit failure
**And** no partial derived field becomes authoritative
**And** `appliedDerivedGeneration` does not falsely advance
**And** the newest required generation remains eligible for safe retry according to the operation contract.

**Given** the same Topic-derived job or logical generation is delivered repeatedly because of retry, worker restart, or concurrent processing
**When** processing repeats
**Then** duplicate execution cannot create duplicate Topic identities or multiple authoritative projections for the same committed generation
**And** generation plus revision validation remains the final correctness boundary.

**Given** Topic-derived processing succeeds, retries, coalesces, becomes stale, or fails
**When** routine observability is emitted
**Then** privacy-safe telemetry can measure refresh backlog, generation lag, coalescing, stale results, context size, AI latency, AI cost, and normalized failures
**And** raw Accepted Evidence, complete AI context, resident-bearing prompts, credentials, and secrets remain outside routine logs, metrics, traces, and Audit History.

**Given** Story 2.5 is verified
**When** focused automated checks run
**Then** tests cover complete same-day context, deterministic evidence ordering, canonical multi-Lane membership, Hokim-only and overlapping service Lanes, cautious Uzbek Cyrillic summaries, disagreement/contradiction/restoration handling, evidence-bound anchor/latest-activity/attribution, generation advancement, generation coalescing, stale generation, stale context revision, atomic projection commit, future profile activation, context overflow, provider/refusal/timeout/rate-limit/invalid-output failure, retry, and duplicate execution
**And** tests prove canonical Topic identity is independent of Lane count
**And** tests prove no partial projection can become authoritative.

### Story 2.6: Enforce Topic-Level Retention and Preserve Accepted Evidence as Source of Truth

As the **Product Owner**,
I want each Topic and its Accepted Evidence to follow one authoritative 90-day retention boundary,
So that retained evidence remains complete while needed and expires predictably without leaving partial or resurrectable resident data.

**Acceptance Criteria:**

**Given** a Topic contains Accepted Evidence
**When** authoritative Topic state is evaluated
**Then** Accepted Evidence remains the source of truth for that Topic
**And** Topic summaries, Lane membership, anchors, attribution, AI outputs, or other derived fields cannot replace the underlying Accepted Evidence
**And** the Topic's retained-evidence count is the count of retained Accepted Evidence messages rather than an inferred count of residents.

**Given** a Topic contains one or more Accepted Evidence items
**When** its retention deadline is calculated
**Then** the deadline is exactly 90 days after the latest relevant Accepted Evidence's original Telegram timestamp
**And** the calculation uses the authoritative `Asia/Tashkent` product time boundary where calendar interpretation is required
**And** worker execution time, AI completion time, retry time, dashboard access time, or Telegram edit time cannot extend retention.

**Given** new Accepted Evidence is validly committed to an existing retained Topic
**When** its original Telegram timestamp is later than the Topic's previous latest-relevant-evidence timestamp
**Then** the Topic's latest relevant evidence timestamp advances
**And** the Topic-level expiry deadline is recalculated from that timestamp
**And** every Accepted Evidence item belonging to the Topic remains retained until the resulting Topic deadline.

**Given** an individual Accepted Evidence item is older than 90 days from its own Telegram timestamp
**But** its Topic has a later Accepted Evidence item whose Topic-level retention deadline has not arrived
**When** normal retention processing runs
**Then** that older Accepted Evidence is not individually expired
**And** the Topic's complete retained evidence trail remains intact.

**Given** a Topic has not reached its authoritative retention deadline
**When** routine retention processing evaluates it
**Then** neither the Topic nor any of its Accepted Evidence is deleted
**And** derived projections or operational cleanup cannot shorten the approved Topic-level retention period.

**Given** a Topic has reached its authoritative retention deadline
**When** retention deletion executes
**Then** the system rechecks the current authoritative latest-relevant-evidence timestamp and expiry condition before deletion
**And** the Topic and all of its Accepted Evidence are removed together through one correctness-preserving deletion boundary
**And** no partial state remains in which the Topic exists without its required evidence or retained evidence exists as an orphan.

**Given** a Topic appears eligible for retention deletion while new Accepted Evidence or another authoritative Topic mutation may occur concurrently
**When** deletion attempts to commit
**Then** eligibility and deletion are protected by one authoritative conditional/transactional correctness boundary
**And** if the Topic's latest-relevant-evidence state changed, the stale deletion commits nothing and the deadline is recalculated
**And** Accepted Evidence cannot be committed into a Topic that has already been authoritatively deleted.

**Given** Topic-linked derived state contains resident-derived information
**When** its Topic expires
**Then** the Topic's summary, Lane projection, anchor, attribution, Hokim-related projection, and other content-bearing Topic-derived state expire with that Topic
**And** no derived representation is retained as a substitute historical copy of deleted Accepted Evidence.

**Given** Topic-linked AI processing records exist while the Topic is retained
**When** operational traceability is required
**Then** committed AI-derived results remain traceable to their logical operation and immutable configuration/profile lineage for as long as their retained subject requires that investigation
**And** routine telemetry still contains no raw evidence or complete AI context
**And** Topic expiry does not leave behind resident-content-bearing AI artifacts that recreate the deleted Topic or evidence.

**Given** a Topic expires while subject-linked AI operational data exists
**When** Topic retention deletion completes
**Then** resident-content-bearing candidate data, AI context, generated Topic content, or other subject-linked material capable of reconstructing the expired Topic/evidence does not survive as a parallel historical copy
**And** only explicitly approved content-free operational metadata may remain
**And** retained metadata cannot reconstruct resident evidence, Telegram identity content, or the deleted Topic summary.

**Given** only privacy-safe, content-free technical metadata is independently required for aggregate operational measurement
**When** its associated Topic expires
**Then** such metadata may remain only where an approved retention or operational contract permits it
**And** it cannot contain resident evidence, generated Topic summaries, AI context, Telegram identity content, search text, or another reconstructable substitute for deleted resident data.

**Given** retention deletion changes canonical same-day AI-input state
**When** Topic and evidence deletion commits
**Then** the affected Mahalla/day `contextRevision` advances atomically as required
**And** any in-flight contextual AI result based on the older canonical state can no longer commit successfully
**And** deleted Topic/evidence state cannot be recreated by a stale provider result.

**Given** a Topic expires while an unfinished Topic-derived refresh, Topic-matching operation, or other subject-dependent asynchronous job still exists
**When** that job later attempts a business side effect
**Then** it rechecks that its District scope and subject still exist and remain valid
**And** deleted Topic or evidence state is not recreated
**And** the obsolete work terminates through an explicit safe outcome rather than silently restoring expired resident data.

**Given** the retention worker evaluates District-owned data
**When** it reads or deletes Topics
**Then** every operation carries explicit District scope
**And** missing District scope is an error rather than an all-District operation
**And** Topics or evidence from another District cannot be deleted through the same scoped business operation.

**Given** the same expired Topic is selected repeatedly because of job retry, worker restart, concurrent processing, or partial infrastructure delivery
**When** retention processing repeats
**Then** deletion is idempotent and retry-safe
**And** repeated execution cannot recreate data, fail because already-deleted resident rows are absent, or generate duplicate consequential business effects.

**Given** Accepted Evidence retains its captured Telegram attribution before expiry
**When** Telegram later edits/deletes the source message or Product Owner mapping configuration changes
**Then** retained evidence continues to use its originally captured text/caption, Telegram timestamp, District, Mahalla, source group, username when available otherwise display name, and permitted identifiers
**And** no phone number is inferred
**And** future-only mapping changes do not rewrite historical attribution.

**Given** a Topic is retained
**When** repeated Accepted Evidence comes from the same Telegram sender
**Then** every independently accepted message remains evidence according to the approved duplicate rules
**And** derived/user-facing logic does not describe those messages as reports from several different residents merely because the retained evidence count is greater than one.

**Given** Mahalla Ovozi is restored from a backup containing Topics or Accepted Evidence that have since passed normal 90-day retention
**When** disaster-restore reconciliation runs before normal application or ingestion access is enabled
**Then** current Topic-level retention rules are reapplied from authoritative original evidence timestamps
**And** already-expired Topics, their Accepted Evidence, and associated content-bearing derived state are removed before users or production processing can access them
**And** restored stale data cannot become operational merely because it existed in the backup.

**Given** retention processing succeeds, finds nothing due, retries, conflicts with newer evidence, or fails
**When** operational telemetry is emitted
**Then** privacy-safe telemetry can measure retention backlog, expired Topic counts, retries, failures, and processing latency
**And** raw Accepted Evidence, Telegram identity content, Topic summaries, AI context, credentials, and secrets remain outside routine logs, metrics, traces, and Audit History.

**Given** Story 2.6 is verified
**When** focused automated checks run
**Then** tests cover Topic-level 90-day expiry, extension by later Accepted Evidence, prevention of premature individual-evidence expiry, atomic Topic/evidence deletion, concurrent newer-evidence arrival, derived-state deletion, restored-backup retention reconciliation, stale AI/job rejection after expiry, duplicate retention jobs, District isolation, original attribution preservation, and privacy-safe observability
**And** tests prove retained evidence cannot become orphaned from its Topic
**And** tests prove deleted Topics or Accepted Evidence cannot be resurrected by stale or retried processing.

### Story 2.7: Preserve AI Operation Traceability and Explicit Failure State

As the **Product Owner**,
I want every production AI operation and provider attempt to have durable, privacy-safe traceability,
So that AI failures and committed results can be investigated without exposing resident evidence or mistaking incomplete processing for success.

**Acceptance Criteria:**

**Given** production processing requires an AI decision or Topic-derived recalculation
**When** a new logical AI operation is created
**Then** it receives its own opaque logical-operation identifier
**And** records the operation type and authoritative District/Mahalla/day/subject scope required for investigation
**And** pins the exact immutable AI profile version selected for that logical operation
**And** no provider-specific SDK object becomes part of the domain/application record.

**Given** a logical AI operation invokes an external AI provider
**When** each provider request is attempted
**Then** that invocation receives a distinct provider-attempt identifier associated with the logical operation
**And** multiple retries remain distinguishable as separate attempts without creating multiple logical business operations
**And** the relationship between logical operation, attempts, and eventual terminal outcome remains queryable.

**Given** an unfinished logical operation is retried
**When** a later provider attempt executes
**Then** it uses the immutable profile already pinned to that logical operation
**And** later activation of a different model, prompt, schema, parameter set, limit, or retry policy does not mutate that existing operation
**And** a genuinely new logical operation created after configuration activation uses the then-active applicable profile.

**Given** an AI profile is referenced by an operation
**When** its lineage is inspected
**Then** the exact project-owned configuration version can resolve the operation type, provider adapter, exact model identifier, prompt version, output-schema version, generation parameters, approved limits, retry policy, and applicable capability configuration
**And** historical profile versions remain immutable rather than being overwritten in place.

**Given** a context-dependent logical AI operation or provider attempt is recorded
**When** its investigation metadata is persisted
**Then** it includes the applicable `contextRevision`, deterministic snapshot fingerprint, serializer version, and target derived generation where relevant
**And** it includes operation/attempt start and completion timestamps and privacy-safe terminal status
**And** none of that traceability stores raw candidate content, raw Accepted Evidence, or complete AI context.

**Given** an AI provider succeeds technically
**When** its output returns to the application
**Then** provider success alone is not a completed business success
**And** the result must pass the project-owned structural validation and operation-specific semantic validation required by Stories 2.3–2.5
**And** any applicable `contextRevision`, subject-validity, and derived-generation commit conditions must also succeed before the logical operation may be recorded as successfully committed.

**Given** provider output passes structural and semantic validation but its contextual snapshot has become stale
**When** the authoritative commit detects an obsolete `contextRevision` or target generation
**Then** the logical operation records the appropriate stale/incomplete outcome such as `STALE_SNAPSHOT`
**And** no AI-derived business state is committed from that attempt
**And** stale work is distinguishable from provider failure and from valid business success.

**Given** the provider refuses, times out, is rate-limited, cannot be reached, returns an upstream failure, or produces structurally or semantically invalid output
**When** the attempt completes
**Then** the native provider response/error is normalized into an approved application failure category
**And** the logical operation does not become successful
**And** no partial relevance, Topic assignment, Accepted Evidence, summary, Lane membership, anchor, attribution, or other AI-derived state is committed because of that failed attempt.

**Given** complete required same-day context exceeds the approved request/provider limit
**When** an AI operation cannot legally construct a complete supported request
**Then** it records an explicit context-overflow failure without silently truncating, summarizing, retrieving top-K, crossing days, or otherwise changing canonical context semantics
**And** no provider invocation is required when overflow is deterministically known before the external call
**And** no plausible-looking partial business result is committed.

**Given** an attempt fails transiently and the operation contract permits retry
**When** retry is scheduled
**Then** only incomplete duplicate-safe work remains eligible
**And** already-completed historical message-level decisions are not replayed merely because another attempt, restart, configuration change, or later context change occurs
**And** retry cannot duplicate a previously committed business effect.

**Given** an unfinished AI operation fails
**When** its operational state is updated
**Then** its state explicitly distinguishes retryable, terminal, and retry-exhausted outcomes according to the pinned operation contract
**And** retry exhaustion cannot leave the operation permanently appearing as pending
**And** completed provider-attempt records remain stable investigation history rather than being overwritten by later attempts.

**Given** an AI operation reaches valid committed success
**When** its terminal state is persisted
**Then** the successful business result is traceable to the logical-operation identifier, pinned immutable profile, applicable provider attempt, snapshot/configuration lineage, and relevant commit revision/generation metadata
**And** later investigation can distinguish the configuration that actually produced the result from whichever configuration is currently active.

**Given** an AI operation cannot currently complete but remains safely retryable
**When** its operational state is persisted
**Then** it remains explicitly incomplete/failed rather than appearing as a successful or silently dropped operation
**And** sufficient privacy-safe state exists for a later eligible retry or Product Owner investigation
**And** raw candidate/evidence content is retained only where another approved story requires it for incomplete processing correctness.

**Given** an AI operation reaches a terminal non-retryable or no-longer-applicable outcome
**When** its subject was discarded, expired, superseded, or otherwise became invalid
**Then** the operational record cannot resurrect that subject
**And** resident-content-bearing retry material is removed according to the applicable evidence/retention lifecycle
**And** only approved privacy-safe operational lineage may remain.

**Given** System Health later evaluates AI processing state
**When** it queries the AI operations boundary
**Then** it can determine privacy-safe counts and status for pending/incomplete work, retries, stale snapshots, context overflow, provider refusal, timeout, rate limit, provider failure, invalid output, and committed success
**And** Epic 2 provides the authoritative operational facts without implementing Epic 4's health-status aggregation or Product Owner System Health UI itself.

**Given** AI operational records are queried for investigation or later System Health use
**When** a District-owned query executes
**Then** it requires explicit District scope
**And** Product Owner cross-District aggregation uses a dedicated explicit global administrative contract
**And** omitted District scope is never interpreted as authorization to read all Districts.

**Given** the Product Owner later investigates an AI-related operational event through Epic 4 or Epic 5 capabilities
**When** they reference the underlying AI operation
**Then** they can correlate safe operation/attempt identifiers and immutable configuration lineage
**And** the operational record contains no raw resident evidence, complete AI context, prompts containing resident content, Telegram message body, credentials, bot token, provider secret, or raw upstream error body.

**Given** routine logs, metrics, and traces observe AI processing
**When** telemetry is emitted
**Then** it can measure logical-operation volume, provider-attempt counts, retries, stale snapshots, context size/tokens, latency, cost, normalized failure categories, and completion state using privacy-safe identifiers/attributes
**And** observability is not treated as the authoritative AI-operation system of record
**And** raw resident content and secrets remain excluded.

**Given** the same provider callback/result, retry job, or worker action is handled repeatedly or concurrently
**When** operation state is updated
**Then** authoritative uniqueness/idempotency boundaries prevent duplicate provider-attempt effects and duplicate logical terminal outcomes
**And** one logical operation cannot become both committed success and contradictory terminal failure through race conditions.

**Given** Story 2.7 is verified
**When** focused automated checks run
**Then** tests cover separate logical-operation and provider-attempt identifiers, immutable profile pinning across retries, future profile activation, structural and semantic validation failures, stale snapshots, derived-generation staleness, context-overflow before provider invocation, refusal, timeout, rate limit, provider failure, duplicate attempts, retry eligibility/exhaustion, successful configuration lineage, subject expiry/invalidation, explicit District-scoped versus global investigation queries, and privacy-safe System Health querying
**And** tests prove a provider-level success cannot bypass application validation/CAS requirements
**And** tests prove no failure path can produce partial AI-derived business success.

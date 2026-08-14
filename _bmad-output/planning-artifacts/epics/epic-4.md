## Epic 4: Operational Health & Auditable Investigation

The Product Owner can determine whether Districts are operating correctly, distinguish real failures from quiet or delayed states, investigate safely, retry eligible incomplete work, inspect one District's retained Topics and evidence for troubleshooting, verify recovery, and inspect immutable operational history.
**FRs covered:** FR19, FR24, FR25, FR26, FR27, FR28.

Implementation/UX notes: Treat System Health, selected-District retained Topic/Evidence investigation, and Audit History as one operational investigation loop. Keep product health application-owned and privacy-safe, require explicit District scope for resident-bearing operational data, distinguish subscription pauses from technical failure, expose only sanitized diagnostics, allow retry only for incomplete duplicate-safe work, record failure/recovery, and add no external alerts, acknowledgement workflow, automatic repair, or raw resident evidence in routine telemetry.

### Story 4.1: Inspect Truthful System and District Health

As the **Product Owner**,  
I want to inspect evidence-based overall, District, and component health,  
So that I can distinguish real technical failures from delays, quiet operation, and insufficient evidence.

**Acceptance Criteria:**

**Given** an authenticated Product Owner opens System Health  
**When** health information loads  
**Then** the page shows application-owned overall product health with a visible last-check time  
**And** it shows each applicable District and monitored component  
**And** the Product Owner can inspect all-District aggregate health or one explicitly selected District  
**And** District-owned data is returned only through explicit District scope, while all-District aggregation uses a dedicated global Product Owner contract  
**And** information from one District never renders in another District context.

**Given** a technical health observation is used to determine component health  
**When** the application evaluates that observation  
**Then** the health input identifies the monitored component, applicable District or global scope, technical check time, technical outcome, and privacy-safe evidence/error category or identifier where applicable  
**And** the evidence distinguishes successful technical confirmation, known technical failure, and insufficient evidence  
**And** raw resident evidence, credentials, secrets, resident-bearing AI context, and raw upstream errors are not part of the health-state contract  
**And** persistence is introduced only where required by this story's health and freshness behavior rather than creating unrelated operational-history structures.

**Given** health is evaluated for a monitored scope  
**When** current technical evidence is interpreted  
**Then** canonical domain/API state values are limited to `Healthy`, `Delayed`, `Degraded`, `Unavailable`, `Quiet`, and `Unknown`  
**And** `Healthy` requires sufficiently recent successful technical evidence  
**And** `Delayed` means an applicable processing target has been exceeded without evidence requiring a stronger state  
**And** `Degraded` means known failures exist while useful operation continues  
**And** `Unavailable` requires direct technical evidence that a required component cannot operate  
**And** `Quiet` represents an applicable silence-capable intake source with no recent activity and no known technical failure  
**And** insufficient or stale evidence produces `Unknown` rather than `Healthy`.

**Given** those canonical state values cross into the Product Owner UI  
**When** status is rendered  
**Then** the canonical English enum values remain stable internal/API identifiers  
**And** visible user-facing labels and explanations use approved Uzbek Cyrillic  
**And** logic, accessibility names, tests, and API contracts do not depend on translated display strings.

**Given** component states must be aggregated into District or overall product health  
**When** hierarchical health is calculated  
**Then** known abnormal states use deterministic precedence `Unavailable > Degraded > Delayed > Unknown > Healthy`  
**And** a stronger known abnormal state is not hidden by a weaker or unknown child state  
**And** any required child in `Unknown` prevents the aggregate from becoming `Healthy` unless a stronger known abnormal state already determines the aggregate  
**And** `Quiet` is neutral when mixed with otherwise `Healthy` technical operation rather than degrading the aggregate  
**And** a District becomes `Quiet` only when all applicable intake sources are `Quiet`, every required technical component has sufficiently recent successful evidence, and no `Delayed`, `Degraded`, `Unavailable`, or `Unknown` condition applies  
**And** overall product health becomes `Quiet` only when every included operating District is `Quiet`, platform-level required components are `Healthy`, and no stronger state applies  
**And** a mix of `Healthy` and `Quiet` Districts aggregates to `Healthy`, not `Quiet`.

**Given** an approved Telegram group has received no recent messages  
**When** its state is evaluated  
**Then** message silence alone never makes the group disconnected, `Degraded`, or `Unavailable`  
**And** sufficiently recent direct failure evidence takes precedence over `Quiet`.

**Given** pilot operating thresholds are evaluated  
**When** an eligible message has not entered processing within 5 minutes  
**Then** the applicable state reflects delay  
**And** when its related Topic update has not become available within 15 minutes, the applicable Topic-processing state reflects delay  
**And** a technical health check older than 10 minutes contributes `Unknown` rather than `Healthy`  
**And** threshold exceedance alone never creates `Unavailable` or a Critical failure without the required direct technical evidence.

**Given** those pilot thresholds need operational adjustment  
**When** deployment configuration is changed through the approved engineering/deployment mechanism  
**Then** the health evaluator uses the controlled configured values  
**And** the Product Owner Console provides no setting for modifying the 5-minute, 15-minute, or 10-minute pilot thresholds  
**And** Story 4.1 introduces no general-purpose health-rule configuration UI.

**Given** the Product Owner inspects System Health coverage  
**When** the District/component matrix is presented  
**Then** it covers Telegram bot and approved-group access, intake freshness, processing queues/workers, AI processing, web application, database, storage, retention jobs, and scheduled-deletion-job capability  
**And** relevant operational information includes last received-message time, queue depth, oldest queued age, active model/prompt version, processing latency, and success/failure counts where applicable  
**And** each status identifies its affected District and component where applicable.

**Given** Epic 6 deletion business workflows have not yet been implemented  
**When** Story 4.1 evaluates scheduled-deletion operational health  
**Then** it monitors only the independently testable technical scheduler/worker capability available at this point in the architecture  
**And** absence of actual District deletion work is not considered failure  
**And** zero scheduled deletion jobs can coexist with `Healthy` technical scheduler capability  
**And** stale or insufficient scheduler checks produce `Unknown` under the same health rules  
**And** Story 4.1 does not create cancellation deadlines, District deletion jobs, backup-expiry business milestones, recovery logic, or any other Epic 6 behavior.

**Given** processing or access is intentionally paused by an authoritative lifecycle/subscription state that is already available to the health boundary  
**When** System Health explains the condition  
**Then** that lifecycle cause remains distinct from technical failure  
**And** an intentional pause does not manufacture `Degraded` or `Unavailable` solely because processing is stopped by policy  
**And** the existing Subscriptions Console destination may be referenced for management context  
**And** Story 4.1 introduces no Epic 6 subscription-management functionality.

**Given** health diagnostics or recent technical errors are presented  
**When** the Product Owner inspects them  
**Then** they expose only necessary privacy-safe District/Mahalla/group/component scope, processing stage, timestamps, safe queue/job/trace identifiers, applicable AI configuration lineage, safe error category, and other approved operational metadata  
**And** resident message text is not shown as routine health diagnostics  
**And** credentials, bot tokens, provider keys, secrets, resident-bearing AI context, and raw upstream error bodies are never exposed  
**And** user-visible errors use sanitized beginner-readable explanations.

**Given** the OTLP collector or another engineering telemetry backend is unavailable  
**When** the Product Owner requests System Health  
**Then** application-owned health continues to evaluate authoritative product state and direct health evidence where available  
**And** telemetry-backend availability is not the source of truth for Product Owner health  
**And** telemetry failure cannot fabricate `Healthy`  
**And** insufficient health evidence still produces `Unknown`.

**Given** one component health check fails while other health information remains available  
**When** System Health renders  
**Then** unaffected District/component data remains usable  
**And** the failed component follows the evidence-based state rules rather than causing an unrelated whole-page failure  
**And** missing evidence produces `Unknown` instead of invented success or invented failure.

**Given** previously successful System Health data is visible  
**When** an ordinary background refresh fails  
**Then** the last successfully permitted data remains visible with a persistent stale warning and its last successful update time  
**And** that displayed historical snapshot is not silently reclassified as newly checked `Healthy`  
**And** browser network loss remains a client-connectivity state and never creates a Product, District, or server health issue.

**Given** System Health is rendered on supported browsers, viewport sizes, and input methods  
**When** the Product Owner reviews the health matrix  
**Then** semantic table/matrix/stacked-record behavior follows the approved responsive data-collection contract  
**And** state meaning never depends on color alone  
**And** keyboard operation and programmatically associated row/column identities remain available  
**And** all visible product copy uses Uzbek Cyrillic  
**And** diagnostic times follow the approved Asia/Tashkent presentation convention.

**Given** System Health operates at the approved MVP capacity envelope  
**When** representative Product Owner health requests are measured under production-shaped conditions  
**Then** at least 95% become usable within the approved 3-second Console target  
**And** larger operational collections use the approved progressive-loading behavior rather than blocking initial usability.

**Given** System Health determines which components apply to a monitored scope  
**When** component health is evaluated  
**Then** applicability is defined explicitly by the application-owned component contract rather than inferred from missing data  
**And** a component that does not apply to that District/scope receives **no health state** and is excluded from hierarchical aggregation  
**And** non-applicability must never be converted into `Unknown`, `Quiet`, or `Healthy`  
**And** if the UI needs to communicate non-applicability, it does so as separate non-health metadata rather than inventing a seventh health state.

**Given** no Districts have been configured  
**When** the Product Owner opens System Health  
**Then** the District collection shows an explicit no-Districts state  
**And** the application creates no synthetic District health result  
**And** zero Districts must not aggregate to `Quiet`, `Unknown`, or `Healthy` as a District result  
**And** independently applicable global platform components may still show their own evidence-based health when valid technical evidence exists.

**Given** a monitored component is registered with System Health  
**When** its health contract is defined  
**Then** the component explicitly declares whether it is global, District-scoped, or legitimately available at both scopes  
**And** global platform components are evaluated once at their authoritative global scope rather than duplicated as independent failures under every District  
**And** District-owned components require explicit District identity  
**And** aggregate Product Health combines the applicable global component results with District aggregate results without duplicating the same technical condition.

**Given** multiple component results contribute to a District or overall aggregate health result  
**When** aggregate `lastCheckAt` is calculated  
**Then** it represents the **oldest latest technical-check timestamp among the required contributing health results**  
**And** the current aggregation/evaluation time is stored separately if needed and cannot masquerade as fresh technical evidence  
**And** recalculating an aggregate from unchanged old evidence does not advance its displayed last-check time  
**And** any contributing required check older than the configured freshness limit continues to force the applicable `Unknown` behavior established earlier.

**Given** health state crosses module, API, and browser boundaries  
**When** Story 4.1 defines its public contracts  
**Then** canonical health enums, component/scope identifiers, timestamps, applicability metadata, health evidence categories, aggregate results, and browser-safe diagnostic fields are defined through project-owned shared Zod contracts in the architecture-approved API-contract boundary  
**And** database rows, telemetry-provider types, job representations, or translated UI strings do not become those contracts  
**And** backend and frontend validation use the same canonical contract definitions  
**And** later Epic 4 stories extend the same contract boundary rather than redefining incompatible equivalents.

**Given** Story 4.1 is verified  
**When** focused automated and browser checks run  
**Then** integration tests cover the six canonical states, deterministic component→District→overall aggregation, mixed `Healthy`/`Quiet`, all-Quiet District behavior, known-failure precedence, required-child `Unknown`, non-applicable component exclusion, zero-District handling, global versus District component ownership, aggregate `lastCheckAt` oldest-contributing calculation, stale contributing evidence preventing `Healthy`, 5/15-minute delay thresholds, >10-minute stale-check behavior, deployment-configured threshold ownership, District isolation/global aggregation, lifecycle-versus-technical separation, deletion-scheduler capability without Epic 6 dependency, privacy-safe diagnostics, telemetry independence, and shared contract validation  
**And** browser tests cover all-District and selected-District System Health, localized visible states backed by canonical enums, stale refresh, responsive matrix presentation, keyboard access, and non-color-only state meaning  
**And** production-shaped verification covers the applicable NFR2 Console usability target.

### Story 4.2: Investigate Active Operational Issues and Verified Recovery

As the **Product Owner**,  
I want to see active operational issues ranked by severity, understand their scope and recommended next step, and have issues resolve automatically when recovery is verified,  
So that I can address real problems without manual ticket tracking, false alarms, or unverified closeouts.

**Acceptance Criteria:**

**Given** component health evaluation detects a condition requiring operational attention  
**When** an operational issue is created or refreshed  
**Then** the application creates one active issue identity for that logical condition  
**And** the identity is derived from its authoritative affected scope, component, and issue category rather than from check time or UI state  
**And** repeated checks showing the same continuing condition update that same issue rather than creating duplicates  
**And** its original start time remains unchanged while the condition continues.

**Given** an active issue is evaluated for severity  
**When** its current technical evidence is classified  
**Then** canonical severity values are limited to `Critical`, `Warning`, and `Information`  
**And** direct evidence that an essential required component cannot operate qualifies for `Critical`  
**And** `Delayed` or `Degraded` technical conditions qualify for `Warning` unless stronger direct evidence requires `Critical`  
**And** `Healthy` and `Quiet` do not create failure issues by themselves  
**And** an `Unknown` state does not become `Critical` merely because evidence is missing or stale  
**And** `Information` is strictly limited to actionable non-failure operational conditions that do not claim a technical failure meeting `Warning` or `Critical` criteria  
**And** `Information` issues must never masquerade as technical component failures or represent healthy baseline operation  
**And** severity derivation is deterministic application logic rather than arbitrary UI labeling.

**Given** canonical issue severity crosses into the UI  
**When** it is displayed  
**Then** internal/API values remain stable canonical enums  
**And** visible labels and explanations use approved Uzbek Cyrillic  
**And** severity meaning does not depend on color alone.

**Given** multiple active issues exist  
**When** System Health or Console Overview displays them  
**Then** issues are ordered by severity `Critical` before `Warning` before `Information`  
**And** ties use a deterministic secondary ordering rather than unstable presentation  
**And** each issue keeps its affected District and component explicit where applicable  
**And** all-District views cannot mix protected District-owned detail.

**Given** the Product Owner opens an issue  
**When** issue detail is displayed  
**Then** it shows the affected scope/component, current severity and health condition, original start time, latest check time, privacy-safe identifiers, safe error category, and recommended next investigation area where applicable  
**And** it routes to an existing applicable management surface when one exists  
**And** if no supported Console action can resolve the condition, it states the next technical area to inspect rather than inventing a repair capability  
**And** raw resident evidence, credentials, secrets, resident-bearing AI context, and raw upstream errors are not exposed.

**Given** subsequent checks prove that the same issue condition still exists  
**When** the active issue is refreshed  
**Then** the same issue remains active  
**And** its latest-check metadata is updated  
**And** its original start time and stable issue identity are preserved  
**And** another failure-start audit transition is not emitted merely because the continuing failure was checked again.

**Given** the evidence required to evaluate an active issue becomes stale or insufficient  
**When** Story 4.1 evaluates the affected health scope as `Unknown`  
**Then** the existing issue is not falsely marked recovered  
**And** loss of evidence alone does not fabricate continuing technical failure beyond what current evidence supports  
**And** the issue remains unresolved until its own required recovery condition is successfully verified or the domain condition is otherwise authoritatively superseded.

**Given** a technical check succeeds somewhere in the system  
**When** issue recovery is evaluated  
**Then** that success can resolve an issue only if the check matches the same affected scope, component, and failure condition required by that issue's recovery contract  
**And** an unrelated successful check cannot resolve the issue  
**And** a successful check for another District cannot resolve it.

**Given** the matching recovery check proves the failed condition no longer exists  
**When** recovery commits  
**Then** the issue transitions from active to resolved automatically  
**And** its recovery time and privacy-safe supporting metadata are recorded  
**And** no Product Owner acknowledgement or manual close action is required  
**And** the same recovery transition cannot be committed twice by duplicate checks, retries, worker restarts, or concurrent evaluation.

**Given** one logical issue transitions from absent to active  
**When** that failure transition is committed  
**Then** the state mutation and its single failure-start audit record commit atomically in the same transactional boundary  
**And** if the audit write fails, the issue transition does not commit  
**And** continuing health checks do not produce duplicate failure-start records.

**Given** that same issue later transitions from active to verified recovered  
**When** recovery commits  
**Then** the state transition from active to resolved and its single verified-recovery audit record commit atomically in the same transactional boundary  
**And** if the audit record cannot be written, the issue remains active and does not falsely claim verified recovery  
**And** duplicate or concurrent recovery evaluation cannot append duplicate recovery transitions.

**Given** a resolved issue condition later fails again  
**When** the new failure is evaluated  
**Then** reopening after a genuinely new later occurrence starts a new distinct issue lifecycle with its own failure-start event rather than mutating the previously resolved lifecycle  
**And** a new failure condition cannot be appended onto an already resolved issue record.

**Given** failure or recovery transitions are audited  
**When** their audit metadata is persisted  
**Then** the actor for automated health and recovery transitions is recorded through an explicit canonical system-actor identity  
**And** the record contains only privacy-safe actor/system, District/scope, component, issue identifier/category, timestamps, transition/outcome, and approved safe diagnostic identifiers or metadata  
**And** raw resident content, credentials, bot tokens, provider secrets, resident-bearing AI context, and raw upstream errors are excluded  
**And** Story 4.2 does not depend on the later Audit History browsing UI.

**Given** issue data crosses module, API, and browser boundaries  
**When** issue models and contracts are defined  
**Then** issue identifiers, severity enums, recovery criteria, investigation categories, and lifecycle representations are project-owned shared Zod contracts extending Story 4.1's contract boundary  
**And** database rows, provider types, and translated display strings do not cross into the API contract.

**Given** processing/access is intentionally paused by an authoritative lifecycle or subscription state  
**When** System Health presents that condition  
**Then** the lifecycle cause remains distinct from a technical failure issue  
**And** it cannot become `Critical` or `Warning` merely because intentional processing is stopped  
**And** an applicable route may point toward the established Subscriptions destination  
**And** Story 4.2 adds no Epic 6 subscription-management behavior.

**Given** an approved Telegram group is merely quiet, the Product Owner browser loses network connectivity, or an operating target is exceeded without stronger evidence  
**When** active issues are evaluated  
**Then** silence alone creates no technical failure issue  
**And** browser connectivity creates no server/District health issue  
**And** target exceedance may produce `Warning` through the applicable delayed condition but cannot produce `Critical` or `Unavailable` without the required direct technical evidence.

**Given** an issue list/detail background refresh fails  
**When** previously loaded issue data remains authorized  
**Then** the last successful permitted data remains visible with stale indication  
**And** the refresh failure does not create, resolve, reopen, or duplicate an operational issue by itself.

**Given** Story 4.2 is verified  
**When** focused automated and browser checks run  
**Then** integration tests cover stable issue identity, repeated-check deduplication, preserved issue start time, deterministic severity, Critical direct-evidence requirement, strictly non-failure `Information` severity, District isolation, continuing-failure updates, `Unknown` without false recovery, matching-scope recovery, unrelated-success rejection, atomic failure-start state+audit commit, atomic verified-recovery state+audit commit, canonical system actor attribution, genuine later recurrence starting a new lifecycle, lifecycle-versus-technical separation, shared contract validation, and privacy-safe metadata  
**And** browser tests cover Overview-to-System-Health investigation, deterministic severity ordering, localized labels backed by canonical enums, issue detail, management routing, stale refresh, responsive detail behavior, keyboard access, focus restoration, and non-color-only severity meaning.

### Story 4.3: Safely Retry Eligible Incomplete Work

As the **Product Owner**,  
I want to trigger manual retry for eligible failed or incomplete processing,  
So that I can safely resume stuck or failed work without creating duplicates, replaying completed decisions, or exposing unsafe actions.

**Acceptance Criteria:**

**Given** an authenticated Product Owner investigates an operational issue or failed processing state  
**When** the retry action is evaluated for display  
**Then** the UI shows a visible Retry control only when the affected operation is explicitly classified as eligible for safe retry  
**And** operations not proven duplicate-safe do not expose a Retry control  
**And** completed, currently running, or permanently terminal work does not expose an active Retry control  
**And** if an eligible failed operation already has an accepted retry actively queued or running, the UI disables or suppresses duplicate manual retry submissions to prevent redundant queue buildup.

**Given** an operation is evaluated for retry eligibility  
**When** the backend validates the retry request  
**Then** eligible operations are limited to failed or incomplete background jobs with idempotent execution keys (intake parsing, Topic derivation recalculation, background sync, scheduled health checks)  
**And** manual retry routes directly through the existing durable processing path and idempotency keys rather than bypassing worker queues  
**And** operations that could create duplicate business effects or replay completed message-level classification/topic-assignment decisions are rejected.

**Given** the Product Owner confirms a valid retry request  
**When** the retry command is executed  
**Then** the backend accepts the retry request, queues the idempotent job execution, and records the manual retry event in the audit log  
**And** the acceptance of the retry request and the creation of its audit record commit atomically in the same transactional boundary  
**And** the command returns a stable execution tracking identifier  
**And** the Product Owner receives immediate feedback that the retry was accepted  
**And** the operational issue or component status reflects pending retry execution without claiming premature recovery.

**Given** the retried job executes in the background worker  
**When** processing completes successfully  
**Then** the affected component health and operational issue update through their normal evidence-based verification rules  
**And** issue resolution occurs only through the matching verified-recovery check defined in Story 4.2  
**And** successful retry execution does not bypass standard recovery verification.

**Given** the retried job fails again  
**When** the failure is processed  
**Then** the operational issue remains active with updated failure metadata  
**And** the retry attempt count increments  
**And** subsequent retry eligibility is evaluated under the same safety rules.

**Given** retry capabilities cross module, API, and browser boundaries  
**When** retry contracts are defined  
**Then** eligible operation types, retry command payloads, tracking responses, and safety rejection codes are project-owned shared Zod contracts extending Epic 4's contract boundary  
**And** backend and frontend strictly enforce the same validation rules.

**Given** Story 4.3 is verified  
**When** focused automated and browser checks run  
**Then** integration tests cover duplicate-safe eligibility filtering, rejection of ineligible/completed/running operations, redundant retry submission suppression, execution through existing durable worker queues, atomic retry acceptance and audit persistence, stable tracking identity, normal recovery verification following retry success, and repeat-failure handling  
**And** browser tests cover Retry button visibility, confirmation dialogs, loading/pending states, keyboard access, and feedback presentation.

### Story 4.4: Inspect Immutable Searchable Audit History

As the **Product Owner**,  
I want to search and filter an immutable audit log of administrative actions, security events, issue transitions, and retry executions,  
So that I can verify operational history, investigate security events, and demonstrate governance compliance.

**Acceptance Criteria:**

**Given** an authenticated Product Owner navigates to Audit History in the Console  
**When** the audit log loads  
**Then** records are presented in strict reverse chronological order (newest first) based on their authoritative event timestamp  
**And** records with identical timestamps use a deterministic secondary sort by unique audit record ID  
**And** the log displays the event timestamp, actor (Product Owner or canonical system actor), affected District/scope, action category, action name, outcome, and safe summary metadata  
**And** raw resident message content, credentials, tokens, AI context, and raw upstream errors are excluded from audit records.

**Given** the Product Owner filters or searches Audit History  
**When** criteria are applied  
**Then** filtering is supported by District scope, date range (evaluated in `Asia/Tashkent` calendar days), action category, actor type, and outcome  
**And** free-text search is strictly restricted to an allowlist of privacy-safe operational metadata fields (identifiers, category names, action names, sanitized error codes)  
**And** the Product Owner's search text itself is excluded from routine logs, metrics, traces, and audit payloads.

**Given** the Product Owner searches or filters large audit collections  
**When** queries execute  
**Then** response times satisfy the applicable 2-second NFR2 target for at least 95% of requests  
**And** pagination uses deterministic keyset/cursor pagination based on the event timestamp and unique ID rather than snapshot subsystems  
**And** new records arriving above the current cursor do not reshuffle or duplicate previously loaded pages.

**Given** the Product Owner inspects an individual audit record  
**When** detail is opened  
**Then** the detail view presents the complete privacy-safe event metadata in a read-only panel (or full-screen view on mobile viewports)  
**And** closing the detail view preserves the exact filter, pagination, and scroll position  
**And** no edit or delete controls exist anywhere in the interface or API contracts.

**Given** an audit record represents a permanent District deletion proof  
**When** the record is returned  
**Then** an explicit discriminator distinguishes ordinary operational audit records from permanent content-free deletion proofs  
**And** the deletion proof exposes only privacy-safe lifecycle proof metadata without reconstructing deleted District detail  
**And** Story 4.4 only reads and displays deletion-proof records without implementing deletion lifecycle logic.

**Given** audit data crosses module, API, and browser boundaries  
**When** Audit History contracts are defined  
**Then** record models, filter parameters, keyset cursor formats, search contracts, and deletion-proof schemas are project-owned shared Zod contracts extending Epic 4's contract boundary  
**And** unknown action categories, invalid date formats, and unsafe query parameters are rejected safely.

**Given** Story 4.4 is verified  
**When** focused automated and browser checks run  
**Then** integration tests cover append-only immutability, newest-first ordering, equal-timestamp tie handling, keyset pagination, concurrent record arrival during pagination, `Asia/Tashkent` calendar filtering, allowlisted metadata search, performance under NFR2 targets, deletion-proof discriminator separation, and shared Zod contract enforcement  
**And** browser tests cover filter combinations, safe search, progressive loading, read-only detail panels, focus restoration, responsive layouts, and absence of edit/delete controls.

### Story 4.5: Browse Retained District Topics and Evidence for Troubleshooting

As the **Product Owner**,  
I want to browse and search the retained Topics and Accepted Evidence for one explicitly selected District,  
So that I can investigate operational questions without mixing resident-bearing data across Districts or changing production decisions.

**Acceptance Criteria:**

**Given** an authenticated Product Owner opens a District in the Console's Districts section  
**When** the retained Topics and Evidence browser is requested  
**Then** one explicit District selection is required before any resident-bearing Topic or Accepted Evidence data is returned  
**And** the selected District remains visibly identifiable  
**And** an all-District or missing-District request cannot return, aggregate, or search resident-bearing Topic/Evidence content  
**And** Product Owner authorization and District scope are derived and enforced server-side.

**Given** the selected District has retained canonical Topics from Epic 2  
**When** the operational Topic collection loads  
**Then** it reads the existing canonical Topic identities, cautious derived summaries, Mahalla, Lane membership, latest meaningful activity, and retained evidence counts without rerunning production AI  
**And** results are read-only operational evidence access rather than a second Topic model, case-management surface, or Product Owner approval/edit workflow  
**And** large collections use the approved deterministic keyset/cursor progressive-loading contract.

**Given** the Product Owner needs to find a retained operational signal  
**When** plain-text search is applied within the explicitly selected District  
**Then** search can match retained Topic summaries, original Accepted Evidence text, permitted Telegram usernames, and retained display names  
**And** matching remains lexical/plain-text rather than AI semantic question answering  
**And** search text is excluded from routine logs, metrics, traces, and Audit History  
**And** no search request can cross the selected District boundary.

**Given** the Product Owner opens a retained Topic from the operational browser  
**When** evidence detail loads  
**Then** the complete retained Accepted Evidence trail remains available oldest-to-newest under the same source-of-truth and progressive-completeness rules established for retained evidence  
**And** original evidence text/caption remains verbatim with original Telegram timestamp and permitted username/display-name identity  
**And** no phone number is inferred or displayed  
**And** Topic summary or other derived data never replaces the underlying Accepted Evidence.

**Given** retained evidence no longer exists because its Topic reached the authoritative retention deadline or District deletion removed it  
**When** the Product Owner requests the Topic or evidence  
**Then** expired/deleted resident-bearing data is unavailable and cannot be reconstructed from AI outputs, telemetry, audit records, or stale browser state  
**And** the browser presents the approved factual unavailable/not-found state without revealing cross-District existence information.

**Given** District A Topic/Evidence results, search text, selection, or detail are loaded  
**When** the Product Owner switches to District B  
**Then** the existing District-switch contract clears District A content-bearing cache, search text, result-derived filters/counts, selections, open detail, and errors before District B resident-bearing data is loaded  
**And** prior-District requests are cancelled where possible  
**And** late District A responses are ignored and never render under District B.

**Given** the browser loses network connectivity or an ordinary background refresh fails while previously authorized District Topic/Evidence data is visible  
**When** the Product Owner continues investigation  
**Then** already-loaded permitted data may remain visible read-only with the approved offline/stale indication  
**And** new loads and searches are blocked while offline rather than queued  
**And** reconnect revalidates the Product Owner session, selected District authorization, lifecycle, and retention before refreshing resident-bearing data.

**Given** the operational Topic/Evidence browser is used on supported responsive widths, at 200% zoom, with keyboard navigation, or reduced-motion preference  
**When** the Product Owner browses results, searches, progressively loads records, or opens/closes evidence detail  
**Then** the approved Console data-collection/detail patterns remain keyboard operable with visible logical focus  
**And** Uzbek Cyrillic UI copy and mixed-script verbatim evidence remain readable without clipping  
**And** state meaning never depends on color alone  
**And** opening/closing detail preserves the originating result context and focus where still valid.

**Given** Story 4.5 operates at the approved MVP envelope  
**When** representative initial Console requests and plain-text search/filter requests are measured under production-shaped conditions  
**Then** initial usable results satisfy the applicable 3-second NFR2 Console target for at least 95% of requests  
**And** search/filter changes satisfy the applicable 2-second target for at least 95% of requests  
**And** progressive loading prevents large retained collections from blocking initial usability.

**Given** Story 4.5 is verified  
**When** focused integration and browser checks run  
**Then** integration tests cover explicit Product Owner District scoping, rejection of missing/all-District resident-bearing searches, cross-District isolation, read-only canonical Topic reuse, plain-text summary/evidence/identity search, complete retained evidence access, retention/deletion invalidation, deterministic progressive loading, stale-response rejection, search-text telemetry exclusion, and NFR2 performance behavior  
**And** browser tests cover District selection, retained Topic browsing, search and zero-result behavior, evidence detail, District switching with prior-content purge, offline/stale behavior, responsive layout, keyboard/focus restoration, and non-color-only state meaning.
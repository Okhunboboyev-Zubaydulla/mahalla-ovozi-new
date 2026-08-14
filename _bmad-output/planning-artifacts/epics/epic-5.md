## Epic 5: Controlled Future Analysis Configuration

The Product Owner can safely change or roll back AI/model/prompt/vocabulary configuration for future processing while preserving exact historical lineage and never replaying completed message-level decisions.
**FRs covered:** FR23.

Implementation/UX notes: Deliver Global and District configuration drafts, validation, field-level diffs, immutable version history, confirmation/reason capture, future-only activation, rollback-as-new-version, and project-owned provider-neutral profile lineage. This stays separate from signal processing because it is a distinct Product Owner operational capability and risk boundary.

### Story 5.1: Prepare a Validated Global Analysis Settings Draft

As the **Product Owner**,  
I want to review the active global analysis settings and save a validated draft of proposed changes,  
So that I can safely prepare model, prompt, and global recognition-vocabulary changes without affecting production processing.

**FRs:** FR23.

**Acceptance Criteria:**

**Given** an authenticated Product Owner opens AI Operations > Global Settings  
**When** the settings load  
**Then** the current active global analysis configuration is presented as read-only reference information  
**And** its exact active version identifier and activation time are visible  
**And** all product-facing copy uses approved Uzbek Cyrillic  
**And** the Global Settings surface does not require, infer, or silently adopt a District context.

**Given** no saved Global Settings draft exists  
**When** the Product Owner begins editing  
**Then** the working draft starts from the currently active global configuration  
**And** only project-owned editable analysis settings approved for this scope are exposed, including the approved model, prompt, and global service vocabulary configuration  
**And** provider SDK/native response objects, credentials, secrets, provider-native infrastructure internals, and other non-product configuration do not cross the browser contract.

**Given** a saved Global Settings draft already exists  
**When** the Product Owner returns to Global Settings  
**Then** the same resumable working draft is restored for continued editing  
**And** the draft is clearly distinguishable from the active configuration  
**And** loading or editing the draft does not alter production behavior.

**Given** the Product Owner has unsaved changes in Global Settings  
**When** they attempt a navigation or context transition that would discard the editing state  
**Then** the approved unsaved-change guard is presented  
**And** choosing to continue editing preserves the exact current values and editing context  
**And** choosing to discard removes only the unpersisted working changes.

**Given** the Global Settings draft satisfies the project-owned validation contract  
**When** the Product Owner selects Save  
**Then** the single resumable working Global Settings draft is persisted  
**And** the UI reports successful Save only, without claiming activation  
**And** the immutable active configuration/profile remains unchanged  
**And** saving the draft does not replay, restart, reassess, or rewrite completed or pending production message-level decisions solely because configuration values were saved.

**Given** the Global Settings draft violates the project-owned validation contract  
**When** Save is attempted  
**Then** the draft is not reported as successfully saved  
**And** one accessible error summary receives focus and links to each invalid control  
**And** each invalid control is programmatically associated with its specific error  
**And** valid entered values remain intact  
**And** errors are sanitized and do not expose provider-native responses, credentials, secrets, or resident content.

**Given** the Product Owner saves or validates a Global Settings draft  
**When** the application evaluates the draft  
**Then** validation is limited to the approved application/configuration contract  
**And** saving or validating the draft does not invoke production AI  
**And** Story 5.1 introduces no special AI evaluation surface, persisted validation examples, AI score, formal evaluation report, or other manual-validation product workflow.

**Given** a Hokim or another unauthorized actor attempts to read or modify Global Settings  
**When** server authorization is evaluated  
**Then** access is denied using server-derived actor context  
**And** browser-supplied role or scope values cannot grant Product Owner configuration authority.

**Given** network connectivity is lost while previously authorized Global Settings are open  
**When** the Product Owner remains offline  
**Then** already-loaded permitted data may remain visible read-only with the approved offline indication  
**And** Save and other mutations are blocked and never queued for automatic replay  
**And** reconnect revalidates the session and Product Owner authorization before refreshing or allowing mutations.

**Given** Global Settings is used with keyboard navigation, supported responsive widths, 200% zoom, or reduced-motion preference  
**When** the Product Owner reviews or edits the draft  
**Then** core controls remain keyboard operable with visible logical focus  
**And** state and validation meaning never depend on color alone  
**And** Cyrillic values, long technical identifiers, and actions remain usable without clipping or unintended page-level horizontal overflow  
**And** reduced-motion preference does not delay essential state feedback.

**Given** Story 5.1 is verified  
**When** focused automated and browser checks run  
**Then** integration tests cover Product Owner authorization, active/draft separation, draft creation and resumption, validation failure, successful draft persistence, and proof that Save does not alter the active configuration/profile  
**And** browser tests cover opening and editing the draft, dirty-state guarding, validation with preserved valid values, resuming the saved draft, and successful Save without activation.

### Story 5.2: Prepare a District Recognition Settings Draft

As the **Product Owner**,  
I want to review and edit a District-specific recognition-settings draft,  
So that I can prepare local Hokim-recognition terms and vocabulary additions without changing production behavior.

**FRs:** FR23.

**Acceptance Criteria:**

**Given** an authenticated Product Owner opens AI Operations  
**When** District Settings is selected without an explicit District  
**Then** the system requires the Product Owner to select one District before District-specific configuration can be viewed or edited  
**And** missing District scope is never interpreted as global or cross-District scope  
**And** protected settings from another District are not exposed.

**Given** an explicit District is selected  
**When** District Settings loads  
**Then** the selected District remains visibly identifiable  
**And** the current active District-specific configuration is shown as read-only reference information  
**And** its active version identifier and activation time are visible  
**And** all product-facing interface copy uses Uzbek Cyrillic.

**Given** the Product Owner begins editing District Settings  
**When** no saved draft exists for that District  
**Then** the draft starts from that District's currently active District-specific configuration  
**And** the editable scope contains the approved District settings: Hokim-recognition terms and optional local vocabulary additions  
**And** global model, prompt, and global service-vocabulary configuration are not silently converted into District-owned settings.

**Given** a saved District Settings draft already exists for the selected District  
**When** the Product Owner returns to that District's settings  
**Then** the draft is restored for continued editing  
**And** it remains clearly distinguishable from the active configuration  
**And** drafts belonging to another District are not loaded or mixed into the selected District.

**Given** District A has a dirty District Settings draft  
**When** the Product Owner attempts to switch to District B  
**Then** the approved unsaved-change guard runs before District context changes  
**And** choosing Continue editing leaves District A, its draft values, and editing context unchanged  
**And** choosing Discard clears the District A draft interaction state before District B settings are loaded  
**And** late District A responses can never render under District B.

**Given** the Product Owner enters District-specific recognition vocabulary  
**When** the draft is validated  
**Then** multilingual Uzbek/Russian, Latin/Cyrillic forms, jargon, abbreviations, common typos, informal terms, and appropriate Hokim-recognition terms can be represented by the application contract  
**And** the UI does not imply that configured vocabulary deterministically admits or rejects Telegram messages  
**And** vocabulary remains AI guidance rather than a keyword-rule engine.

**Given** the District Settings draft violates the project-owned validation contract  
**When** Save is attempted  
**Then** the draft is not reported as successfully saved  
**And** one accessible error summary receives focus and links to every invalid field  
**And** valid entered values remain intact  
**And** each invalid field exposes its specific sanitized validation error without revealing resident content, credentials, provider secrets, or upstream error bodies.

**Given** a valid District Settings draft  
**When** the Product Owner selects Save  
**Then** the resumable working draft is persisted only for the explicitly selected District  
**And** the UI reports successful Save without claiming activation  
**And** the currently active District configuration remains unchanged  
**And** saving the draft performs no AI processing and does not replay, reassess, or rewrite any completed historical message-level decision.

**Given** a Hokim or unauthorized request attempts to read or modify District Settings  
**When** server authorization is evaluated  
**Then** access is denied using server-derived actor and District context  
**And** browser-supplied District or role values cannot grant unauthorized configuration access  
**And** the denial does not disclose another District's protected configuration.

**Given** network connectivity is lost while previously authorized District Settings are open  
**When** the Product Owner remains offline  
**Then** already-loaded permitted data may remain visible read-only with an offline indication  
**And** Save and other mutations are blocked and never queued for automatic replay  
**And** reconnect revalidates session, Product Owner authorization, and active District context before refreshing.

**Given** District Settings is used with keyboard navigation, supported responsive widths, 200% zoom, or reduced-motion preference  
**When** the Product Owner reviews or edits the draft  
**Then** core controls remain keyboard operable with visible logical focus  
**And** state and validation meaning never depend on color alone  
**And** Cyrillic vocabulary, long District names, technical identifiers, and actions remain usable without clipping or unintended page-level horizontal overflow.

**Given** Story 5.2 is verified  
**When** focused automated checks run  
**Then** integration tests cover explicit District scoping, cross-District isolation, draft creation/resumption, validation, and proof that Save does not alter active configuration  
**And** browser tests cover District selection, draft editing, dirty District switching, cross-District draft separation, validation failure with preserved values, and successful Save without activation.

### Story 5.3: Review and Activate a Future-Only Analysis Configuration Version

As the **Product Owner**,  
I want to review the exact configuration changes and explicitly activate a saved Global or District draft,  
So that future AI processing uses the intended configuration without rewriting or replaying historical decisions.

**FRs:** FR23.

**Acceptance Criteria:**

**Given** a saved Global Settings or District Settings draft exists  
**When** the Product Owner opens its activation review  
**Then** the system clearly identifies whether the scope is Global or a specific District  
**And** District activation identifies the exact selected District  
**And** the current active version identifier and activation time are shown  
**And** the proposed configuration is compared against the currently active configuration using a field-level diff  
**And** unchanged configuration is not presented as a change.

**Given** the field-level diff is displayed  
**When** the Product Owner reviews it  
**Then** additions, removals, and modifications are understandable without relying on color alone  
**And** long model, prompt, vocabulary, or technical values remain readable  
**And** any intentionally horizontally scrollable diff region is explicitly labelled and keyboard-scrollable  
**And** the surrounding page does not introduce unintended horizontal overflow.

**Given** no saved draft exists or the draft contains no effective changes from the active configuration  
**When** activation is requested  
**Then** no new configuration version is created  
**And** the active configuration remains unchanged  
**And** the Product Owner receives a specific, sanitized explanation.

**Given** the Product Owner intends to activate the reviewed draft  
**When** they proceed toward activation  
**Then** an explicit confirmation step presents the exact Global or District scope  
**And** it states that the change affects future processing only  
**And** it states that completed historical message-level decisions will not be replayed or rewritten  
**And** cancellation returns focus safely to the initiating control without activating anything.

**Given** activation requires an operational reason  
**When** the Product Owner enters that reason  
**Then** a non-sensitive reason is required before activation can proceed  
**And** help text prohibits resident message content, resident identifiers, credentials, bot tokens, provider keys, and other secrets  
**And** known product secrets are rejected with a sanitized field-level validation error  
**And** no general PII-redaction workflow is introduced.

**Given** the draft and activation request are valid and still based on the current active version  
**When** the Product Owner confirms activation  
**Then** the server atomically creates a new immutable configuration version  
**And** records its exact activation time  
**And** records its Global or District scope  
**And** preserves the project-owned immutable configuration/profile lineage required for later processing-result traceability  
**And** the prior active version is not overwritten or mutated  
**And** the newly created version becomes authoritative for that scope only after the atomic activation succeeds.

**Given** activation succeeds  
**When** the authoritative server response is returned  
**Then** the UI reports success only after that response  
**And** the new active version identifier and activation time are displayed  
**And** the successfully activated working draft is no longer presented as an outstanding draft  
**And** subsequent editing for that scope starts from the newly active configuration  
**And** duplicate activation submissions cannot create duplicate versions.

**Given** activation fails before the transaction completes  
**When** any validation, authorization, persistence, or configuration error occurs  
**Then** no partial version becomes active  
**And** the previous active configuration remains authoritative  
**And** the UI does not show optimistic success  
**And** the error is sanitized and does not expose provider-native responses, credentials, secrets, or resident content.

**Given** another authoritative activation has changed the active version since the draft's activation review was loaded  
**When** the Product Owner attempts to activate the stale draft  
**Then** the server rejects the activation rather than silently applying it against a different baseline  
**And** no new active version is created from the stale request  
**And** the Product Owner is required to refresh and review the diff against the current active version before confirming again  
**And** the draft is not silently discarded.

**Given** a new configuration version has been activated  
**When** production AI work begins after activation  
**Then** newly created logical AI operations use the then-active immutable configuration/profile lineage  
**And** every resulting committed processing result can retain the exact configuration lineage used for that operation  
**And** provider-native configuration objects do not become the product-facing lineage contract.

**Given** a logical AI operation was already created before the new version was activated  
**When** that operation executes or retries after activation  
**Then** it remains pinned to the immutable configuration/profile selected when that logical operation was created  
**And** a retry does not silently adopt the newly active profile  
**And** activation does not restart the operation solely to move it onto the new version.

**Given** completed message-level relevance, Lane, or Topic-assignment decisions exist from before activation  
**When** a new version becomes active  
**Then** those completed decisions are not automatically rerun, reassessed, or rewritten  
**And** committed historical results continue to preserve their original configuration lineage.

**Given** new Accepted Evidence subsequently updates the derived fields of a retained same-day Topic under normal product behavior  
**When** that new processing occurs after activation  
**Then** the update may use the configuration active for that new logical operation  
**And** the newly committed result preserves the exact configuration lineage it used  
**And** earlier committed message-level decisions are not retroactively replaced.

**Given** a District-specific draft for District A is activated  
**When** activation completes  
**Then** only District A's future District-specific configuration changes  
**And** District B configuration is unchanged  
**And** Global configuration is unchanged.

**Given** a Global draft is activated  
**When** activation completes  
**Then** the new Global configuration becomes the Global configuration for future applicable processing  
**And** existing District-specific configuration versions are not rewritten as part of the Global activation.

**Given** an unauthorized actor attempts activation  
**When** the server evaluates the request  
**Then** authorization uses server-derived actor and scope context  
**And** client-supplied role or District values cannot grant configuration authority  
**And** no configuration version or activation audit event is created from the denied request.

**Given** activation succeeds  
**When** the action is committed  
**Then** the append-only audit trail records sufficient non-sensitive metadata to identify the actor, affected scope, previous version, newly activated version, activation time, and supplied operational reason  
**And** audit data does not contain prohibited resident content or secrets.

**Given** connectivity is unavailable  
**When** the Product Owner views an already-loaded activation review  
**Then** already-authorized information may remain visible read-only  
**And** activation is blocked  
**And** activation is never queued for automatic replay  
**And** reconnect revalidates session, authorization, and District context before activation becomes available again.

**Given** the activation workflow is used with keyboard navigation, 200% zoom, supported responsive widths, or reduced-motion preference  
**When** the Product Owner reviews the diff, enters a reason, confirms, cancels, or handles an error  
**Then** the workflow remains keyboard operable with visible logical focus  
**And** confirmation and validation state do not depend on color alone  
**And** Cyrillic text, long identifiers, and critical actions remain usable without clipping  
**And** reduced-motion preference does not delay access to authoritative state.

**Given** Story 5.3 is verified  
**When** focused automated checks run  
**Then** integration tests cover Global and District activation, immutable version creation, activation timestamps, authorization, reason validation, stale-version rejection, atomic failure, duplicate-submission protection, and scope isolation  
**And** tests prove completed historical decisions are not replayed by activation  
**And** tests prove pre-existing logical AI operations remain pinned to their original immutable configuration/profile  
**And** browser tests cover diff review, confirmation, cancellation, validation errors, stale refresh, successful activation, and authoritative success state.

### Story 5.4: Review Configuration History and Roll Back as a New Future-Only Version

As the **Product Owner**,  
I want to review previous configuration versions and restore a known earlier configuration as a new active version,  
So that I can safely recover from an undesirable configuration change without rewriting history or replaying past processing.

**FRs:** FR23.

**Acceptance Criteria:**

**Given** the Product Owner opens AI Operations configuration history  
**When** Global Settings history is selected  
**Then** the system shows the immutable activated-version history for Global configuration  
**And** each entry identifies at minimum its version identifier and activation time  
**And** the currently active version is clearly identifiable  
**And** District-specific versions are not mixed into the Global history.

**Given** the Product Owner opens District Settings history  
**When** no explicit District is selected  
**Then** the system requires a District before displaying District configuration history  
**And** it never interprets all-District context as permission to combine protected District histories.

**Given** an explicit District is selected  
**When** its configuration history loads  
**Then** only versions belonging to that District are displayed  
**And** the currently active District version is clearly identifiable  
**And** Global and other-District versions are not mixed into that history.

**Given** a historical configuration version is displayed  
**When** the Product Owner reviews it  
**Then** the historical version is read-only  
**And** its stored configuration cannot be directly edited, deleted, overwritten, or marked active in place  
**And** its original version identity and activation metadata remain unchanged.

**Given** the Product Owner selects an earlier version for rollback  
**When** the rollback review opens  
**Then** the system identifies the exact selected historical version  
**And** identifies the current active version  
**And** displays a field-level comparison between the current active configuration and the configuration that would be restored  
**And** the exact Global or District scope is visible  
**And** District rollback identifies the exact District.

**Given** the rollback comparison is displayed  
**When** additions, removals, or modified values are shown  
**Then** differences are understandable without relying on color alone  
**And** long prompt, model, vocabulary, identifier, and Cyrillic values remain readable  
**And** any intentional horizontally scrollable diff region is labelled and keyboard-scrollable  
**And** the surrounding page has no unintended horizontal overflow.

**Given** the Product Owner selects the currently active configuration version as the rollback source  
**When** rollback is requested  
**Then** no new configuration version is created  
**And** the Product Owner receives a specific sanitized explanation that no effective rollback exists.

**Given** the Product Owner proceeds with a valid historical version  
**When** confirmation is requested  
**Then** the confirmation explicitly states that rollback will create and activate a new configuration version  
**And** the selected historical version itself will remain unchanged  
**And** the change affects future processing only  
**And** completed historical message-level decisions will not be replayed or rewritten  
**And** cancelling performs no mutation and returns focus safely to the initiating control.

**Given** a rollback requires an operational reason  
**When** the Product Owner enters the reason  
**Then** a non-sensitive reason is required before confirmation  
**And** help text prohibits resident content, resident identifiers, credentials, bot tokens, provider keys, and other secrets  
**And** known product secrets are rejected with a sanitized validation error  
**And** no general PII-redaction feature is introduced.

**Given** the selected historical version and current active baseline are still valid  
**When** the Product Owner confirms rollback  
**Then** the server atomically creates a **new immutable version** whose configuration values are copied from the selected historical version  
**And** assigns the new version its own distinct version identifier  
**And** records a new activation time  
**And** preserves the selected historical version unchanged  
**And** makes the newly created version authoritative for future processing in that scope only after the atomic operation succeeds.

**Given** version `V2` is historical and the current active version is `V5`  
**When** the Product Owner rolls back to the configuration represented by `V2`  
**Then** the system creates a new version such as `V6` containing the approved configuration copied from `V2`  
**And** `V2` remains an immutable historical record  
**And** `V5` remains in history  
**And** the history records `V6` as the newly activated version rather than pretending `V2` was activated again.

**Given** the rollback succeeds  
**When** the authoritative server response returns  
**Then** success is displayed only after that response  
**And** the newly created active version identifier and activation time are shown  
**And** configuration history reflects the new version without rewriting prior entries  
**And** subsequent editing starts from the newly active configuration.

**Given** rollback creation or activation fails  
**When** any authorization, validation, persistence, or configuration error occurs before the atomic operation completes  
**Then** no partial rollback version becomes active  
**And** the previous active version remains authoritative  
**And** no optimistic success is shown  
**And** the error remains sanitized.

**Given** another successful activation or rollback changes the active version after the rollback review was loaded  
**When** the Product Owner confirms the stale rollback  
**Then** the server rejects it instead of applying it against a changed baseline  
**And** no rollback version is activated  
**And** the Product Owner must refresh and review the comparison against the new current active version before confirming again.

**Given** a District rollback is confirmed for District A  
**When** it succeeds  
**Then** only District A receives the newly activated District configuration version  
**And** District B remains unchanged  
**And** Global configuration remains unchanged.

**Given** a Global rollback succeeds  
**When** its new Global version becomes active  
**Then** existing immutable District-specific versions are not rewritten or recreated as part of that operation.

**Given** a rollback version becomes active  
**When** new logical AI processing starts afterward  
**Then** applicable new operations use the newly active immutable configuration/profile lineage  
**And** committed results can retain the exact version lineage used for that processing.

**Given** a logical AI operation was created before rollback activation  
**When** that operation executes or retries after the rollback  
**Then** it remains pinned to the immutable profile selected when that operation was created  
**And** rollback does not silently move the operation to the new version or restart it solely because configuration changed.

**Given** completed message-level relevance, Lane, or Topic-assignment decisions exist from earlier versions  
**When** rollback succeeds  
**Then** those decisions are not automatically replayed, reassessed, or rewritten  
**And** their original configuration lineage remains intact.

**Given** new Accepted Evidence later causes an allowed same-day Topic-derived-field update  
**When** that new processing occurs after rollback activation  
**Then** the new logical operation may use the newly active rolled-back configuration  
**And** its committed result preserves that exact lineage  
**And** previously committed message-level decisions remain unchanged.

**Given** rollback succeeds  
**When** the append-only audit record is written  
**Then** it identifies the actor, scope, previously active version, historical source version, newly created version, activation time, and supplied operational reason  
**And** prohibited resident content or secrets are not stored in the audit metadata.

**Given** an unauthorized actor requests configuration history or rollback  
**When** server authorization runs  
**Then** access is determined from server-derived actor and scope context  
**And** client-supplied role or District values cannot grant access  
**And** no protected configuration, version, or rollback mutation is exposed.

**Given** connectivity is unavailable  
**When** previously authorized configuration history is already loaded  
**Then** permitted history may remain visible read-only  
**And** rollback mutations are blocked  
**And** rollback is never queued for automatic replay  
**And** reconnect revalidates session, authorization, and District context before mutations become available.

**Given** the history and rollback flow is used with keyboard navigation, supported responsive widths, 200% zoom, or reduced motion  
**When** the Product Owner browses history, reviews a diff, enters a reason, confirms, cancels, or handles errors  
**Then** the workflow remains keyboard operable with visible logical focus  
**And** meaning does not depend on color alone  
**And** long identifiers and Cyrillic content remain usable without clipping  
**And** reduced-motion preference does not delay authoritative state changes.

**Given** Story 5.4 is verified  
**When** focused automated checks run  
**Then** integration tests cover Global and District history isolation, immutable history, rollback-as-new-version, version copying, new activation timestamps, authorization, reason validation, atomic failure, stale-baseline rejection, scope isolation, and audit metadata  
**And** tests prove that rollback never mutates or reactivates a historical version in place  
**And** tests prove completed message-level decisions are not replayed  
**And** tests prove pre-existing logical AI operations remain pinned to their original profiles  
**And** browser tests cover history review, version selection, diff review, cancellation, stale refresh, rollback confirmation, and successful new-version activation.

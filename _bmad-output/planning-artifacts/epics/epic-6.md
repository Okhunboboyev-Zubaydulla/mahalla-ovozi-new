## Epic 6: Subscription Lifecycle, Recovery & Verified Deletion

The Product Owner can manage Active, Grace, Suspended, and Cancelled District states, recover an eligible cancelled District, or allow it to proceed safely through live deletion and protected-backup expiry with disaster-restore reconciliation.
**FRs covered:** FR29, FR30, FR31, FR32.

Implementation/UX notes: Keep commercial lifecycle, recovery, retention interaction, live deletion, backup expiry, deletion tombstones, and restore reconciliation together as one business correctness boundary. Preserve exact lifecycle consequences, future-message-only reactivation, high-assurance cancellation, retry-safe deletion milestones, and Critical health visibility for failed deletion or backup expiry.

### Story 6.1: Review and Maintain District Subscription Records

As the **Product Owner**,  
I want to review each District's current subscription record and maintain its external payment reference and internal note,  
So that I can track manually managed product access without adding payment processing to Mahalla Ovozi.

**FRs:** FR29.

**Acceptance Criteria:**

**Given** an authenticated Product Owner opens Subscriptions  
**When** the subscription list loads  
**Then** every permitted District is shown with its current subscription status, status start date/time, and next scheduled transition if any  
**And** each District is individually identifiable  
**And** the displayed subscription state is the authoritative lifecycle state  
**And** product-facing copy and ordinary date/time presentation follow the approved Uzbek Cyrillic and Asia/Tashkent conventions.

**Given** no Districts are available to the Product Owner  
**When** Subscriptions loads  
**Then** a factual empty state is shown  
**And** the interface invents no subscription, billing, or technical-health data.

**Given** the Product Owner opens one District's subscription detail  
**When** the detail loads  
**Then** the selected District remains explicit  
**And** current status, status start time, next scheduled transition if any, optional external payment reference, and optional internal note are shown  
**And** District scope is never inferred from omitted or client-supplied authorization values.

**Given** the Product Owner edits the external payment reference or internal note  
**When** valid values are saved  
**Then** the change is persisted only for the explicitly selected District  
**And** lifecycle status and its schedule remain unchanged  
**And** success is shown only after the authoritative server response  
**And** the metadata edit does not change intake, AI processing, Hokim access, retention, cancellation, recovery, or deletion behavior.

**Given** the Product Owner enters an external payment reference or internal note containing a known product secret  
**When** Save is attempted  
**Then** the save is rejected with a sanitized field error  
**And** help text prohibits resident message content, resident identifiers, credentials, bot tokens, provider keys, and other secrets  
**And** valid entered values remain available for correction  
**And** no general personal-data-redaction workflow is introduced.

**Given** subscription information is presented  
**When** payment-related context is shown  
**Then** the interface states that payment is managed externally  
**And** Mahalla Ovozi introduces no card handling, payment collection, invoices, pricing-plan management, checkout, or automatic billing.

**Given** a District is Active, Grace, Suspended, or Cancelled  
**When** its subscription state is displayed  
**Then** the state is presented as commercial/product-access lifecycle state  
**And** a restricted lifecycle state is not treated as a technical failure solely because product access or processing is intentionally restricted.

**Given** Story 6.1 is implemented  
**When** the Product Owner uses the subscription record surface  
**Then** lifecycle transition actions such as starting Grace, restoring service, or cancelling the District are not implemented by this story  
**And** Grace expiry, Suspension, cancellation recovery, live deletion, and backup expiry remain outside this story  
**And** the subscription record nevertheless establishes the authoritative current lifecycle state required by later lifecycle capabilities.

**Given** a Hokim or another unauthorized actor attempts to read or modify Product Owner subscription records  
**When** server authorization is evaluated  
**Then** access is denied using server-derived actor context  
**And** browser-supplied role or District values cannot grant Product Owner subscription authority  
**And** every District operation uses explicit District scope.

**Given** District A subscription data is open  
**When** the Product Owner switches to District B  
**Then** any required unsaved-change resolution occurs before the context change  
**And** protected District A state is removed before District B data is loaded  
**And** late District A responses cannot render under District B.

**Given** network connectivity is lost while previously authorized subscription data is open  
**When** the Product Owner remains offline  
**Then** already-loaded permitted data may remain visible read-only with the approved offline indication  
**And** Save and lifecycle mutations are unavailable and never queued for automatic replay  
**And** reconnect revalidates session, authorization, explicit District context, and current lifecycle state before mutations are allowed.

**Given** the subscription list or detail is used with keyboard navigation, supported responsive widths, or 200% zoom  
**When** the Product Owner reviews or edits subscription information  
**Then** table headers and controls retain correct semantic relationships  
**And** lifecycle meaning does not depend on color alone  
**And** long District names, external references, actions, and Cyrillic content remain usable without unintended page-level horizontal overflow.

**Given** Story 6.1 is verified  
**When** focused automated and browser checks run  
**Then** integration tests cover Product Owner authorization, explicit District scoping, aggregate list, District detail, metadata persistence, validation failure, and proof that metadata Save does not alter lifecycle state  
**And** browser tests cover list/detail behavior, metadata editing and validation, District switching, responsive behavior, and offline mutation blocking.

### Story 6.2: Manage Active, Grace, and Suspended District Service

As the **Product Owner**,  
I want to start Grace, allow overdue Grace to become Suspended automatically, and restore an eligible District to Active,  
So that product access follows the District's manually managed subscription lifecycle without losing retained data or replaying missed processing.

**FRs:** FR29, FR30.

**Acceptance Criteria:**

**Given** the Product Owner opens an eligible District's subscription detail  
**When** the current lifecycle state is shown  
**Then** only actions valid for that current state are available  
**And** each action presents its operational consequence before confirmation  
**And** invalid state transitions cannot be created by manipulating browser requests  
**And** the server evaluates every transition against the authoritative current lifecycle state.

**Given** an Active District  
**When** the Product Owner chooses to start Grace  
**Then** a confirmation dialog identifies the exact District  
**And** states that intake, AI processing, and Hokim access will continue during Grace  
**And** states that normal Topic and Accepted Evidence retention continues unchanged  
**And** states that Grace will automatically become Suspended after exactly seven days unless the District is restored to Active first  
**And** the transition is not applied until explicitly confirmed.

**Given** the Product Owner confirms starting Grace against the still-current Active state  
**When** the authoritative transition succeeds  
**Then** the District becomes Grace atomically  
**And** the exact Grace start and scheduled expiry timestamps are recorded  
**And** the UI reports successful Save only after the server confirms it  
**And** the new state, start time, expiry time, and consequences are durably visible  
**And** the transition is recorded in append-only Audit History using privacy-safe metadata.

**Given** a District is in Grace  
**When** its scheduled Grace expiry is reached and no successful restoration to Active has occurred  
**Then** the system automatically transitions it to Suspended exactly once  
**And** the transition is duplicate-safe if the scheduled work is retried  
**And** the authoritative Suspended state is persisted before success is recorded.

**Given** a District becomes Suspended  
**When** lifecycle enforcement takes effect  
**Then** new Telegram intake for that District is stopped  
**And** new AI processing is stopped  
**And** the District Hokim loses product access  
**And** already-retained District data is not deleted merely because of Suspension  
**And** ordinary Topic/evidence retention continues according to its existing expiry rules  
**And** background jobs re-check the current lifecycle before performing District external or AI side effects.

**Given** a Hokim session was valid immediately before the District became Suspended  
**When** the new lifecycle state becomes authoritative  
**Then** protected Hokim content is removed from the browser surface  
**And** subsequent protected requests are denied  
**And** an already-issued session cannot bypass the Suspended access rule  
**And** the Product Owner retains only the operational Console access allowed by the approved lifecycle contract.

**Given** unfinished District work exists when Suspension becomes authoritative  
**When** a worker later attempts an external Telegram or AI side effect  
**Then** the worker re-checks the District lifecycle state  
**And** prohibited work does not proceed while Suspended  
**And** no completed historical production decision is replayed or rewritten.

**Given** a District is in Grace and is otherwise eligible for service  
**When** the Product Owner chooses Restore Active  
**Then** a consequence confirmation identifies the exact District  
**And** states that full service will continue or resume  
**And** no message backfill or historical replay will occur  
**And** normal retention remains unchanged.

**Given** a District is Suspended and remains otherwise eligible for activation  
**When** the Product Owner chooses Restore Active  
**Then** the server verifies the lifecycle transition is still allowed  
**And** verifies the District remains eligible under the activation prerequisites already established by earlier onboarding capabilities  
**And** restoring Active does not bypass required District configuration or security validity.

**Given** a valid Grace or Suspended District is restored to Active  
**When** the authoritative transition succeeds  
**Then** the District becomes Active atomically  
**And** new Telegram intake, AI processing, and Hokim access are enabled prospectively  
**And** service resumes only for Telegram messages received after reactivation  
**And** messages missed while Suspended are not fetched, reconstructed, backfilled, or replayed  
**And** previously completed processing is not rerun merely because the District returned to Active.

**Given** any Active/Grace/Suspended lifecycle status change in Story 6.2 becomes authoritative  
**When** Active-to-Grace, automatic Grace-to-Suspended, Grace-to-Active, or Suspended-to-Active succeeds  
**Then** exactly one immutable append-only Audit History event records the District, previous state, new state, effective time, result, and actor using privacy-safe metadata  
**And** Product Owner initiated transitions use the Product Owner actor while automatic Grace expiry uses the canonical system actor  
**And** any permitted supplied reason is retained under the Audit History contract  
**And** duplicate requests, worker retries, or concurrent evaluation cannot create duplicate audit records for one logical status transition.

**Given** Grace expiry and a Product Owner Restore Active request occur concurrently  
**When** both attempt to change the same current lifecycle state  
**Then** only a transition valid against the authoritative current state succeeds  
**And** the losing operation does not overwrite the newer lifecycle state  
**And** the Product Owner receives the refreshed authoritative state rather than false success.

**Given** a lifecycle transition request is submitted more than once because of retry or duplicate interaction  
**When** the system processes those requests  
**Then** one logical state transition produces at most one business effect  
**And** duplicate submissions do not create duplicate scheduled transitions or duplicate audit effects  
**And** automatic retry occurs only where the operation contract makes retry safe.

**Given** the transition fails before authoritative completion  
**When** persistence, authorization, validation, or scheduling fails  
**Then** no partial lifecycle state is presented as successful  
**And** the prior authoritative state remains in effect unless the transaction completed  
**And** the UI exposes a sanitized actionable failure  
**And** raw infrastructure errors, resident content, credentials, and secrets remain hidden.

**Given** subscription state is Grace or Suspended  
**When** System Health represents the District  
**Then** the lifecycle state is not classified as a technical failure merely because service behavior follows that state  
**And** if lifecycle state explains stopped access or processing, System Health may state that cause and route the Product Owner to Subscriptions.

**Given** browser connectivity is lost before a lifecycle transition is confirmed complete  
**When** the Product Owner remains offline  
**Then** the operation remains unconfirmed  
**And** no lifecycle mutation is automatically queued or resubmitted  
**And** reconnect revalidates session, authorization, District context, and authoritative lifecycle state before another action is allowed.

**Given** the lifecycle confirmation dialog is opened  
**When** it is used with keyboard navigation or supported responsive layouts  
**Then** it has an accessible title and consequence description  
**And** background content is inert while open  
**And** keyboard focus remains contained  
**And** safe Cancel receives initial focus for ordinary subscription transitions  
**And** Escape cancels without mutating state  
**And** focus returns to the exact initiating control after dismissal.

**Given** Story 6.2 is verified  
**When** focused automated and browser checks run  
**Then** integration tests cover Active-to-Grace, exact seven-day scheduling, Grace-to-Suspended automatic transition, Grace-to-Active, Suspended-to-Active, one audit event for every successful status transition with Product Owner/system actor attribution, authorization, invalid transitions, duplicate-safe expiry, concurrent transition rejection, lifecycle enforcement on jobs, and future-message-only reactivation  
**And** browser tests cover consequence confirmation, timeline/state feedback, Hokim access removal after Suspension, restoration, failure handling, responsive/keyboard behavior, and offline mutation blocking.

### Story 6.3: Cancel and Recover a District Before Live Deletion

As the **Product Owner**,  
I want to cancel a District with explicit consequences and recover it during the permitted recovery window,  
So that participation can end safely while still allowing a controlled return before permanent live deletion.

**FRs:** FR29, FR31.

**Acceptance Criteria:**

**Given** the Product Owner opens an eligible District's subscription detail  
**When** Cancellation is available  
**Then** the action is clearly destructive and distinct from Suspension  
**And** the selected District is explicitly identified  
**And** cancellation cannot be initiated for an omitted, inferred, or unauthorized District scope.

**Given** the Product Owner chooses Cancel District  
**When** the high-assurance confirmation is presented  
**Then** it states the exact live-system deletion deadline, calculated as 30 days after cancellation  
**And** states the protected-backup expiry deadline/rule  
**And** states that intake, AI processing, and Hokim access stop immediately  
**And** states that the stored Telegram bot token will be removed from Mahalla Ovozi  
**And** states that normal Topic and Accepted Evidence retention continues unchanged during the recovery window  
**And** states that recovery can restore only data that remains unexpired  
**And** states that missed Telegram messages will not be backfilled or replayed.

**Given** the cancellation confirmation is open  
**When** the Product Owner has not supplied both a non-sensitive cancellation reason and the exact District name  
**Then** destructive confirmation remains unavailable  
**And** ordinary safe Cancel remains available  
**And** pressing Enter never performs District cancellation.

**Given** the Product Owner enters a cancellation reason  
**When** a known product secret is detected  
**Then** cancellation is blocked with a sanitized validation error  
**And** help text prohibits resident message content, resident identifiers, credentials, bot tokens, provider keys, external payment secrets, and other sensitive information  
**And** no general personal-data-redaction workflow is added.

**Given** the Product Owner supplies the required confirmation and the District is still eligible to be Cancelled  
**When** cancellation succeeds  
**Then** the District becomes Cancelled atomically  
**And** new Telegram intake stops  
**And** new AI processing stops  
**And** Hokim access is revoked  
**And** the stored District bot token is removed from active Mahalla Ovozi storage  
**And** live-system deletion is scheduled for exactly 30 days after the authoritative cancellation time  
**And** the scheduled deletion time is persisted rather than calculated only in the browser  
**And** successful cancellation is reported only after the authoritative server response.

**Given** cancellation has become authoritative  
**When** outstanding District jobs later attempt Telegram, AI, or another prohibited production side effect  
**Then** they re-check current lifecycle state  
**And** prohibited work does not continue  
**And** completed historical processing is not replayed or rewritten.

**Given** a Hokim session was active when the District becomes Cancelled  
**When** lifecycle enforcement occurs  
**Then** protected Hokim content is immediately removed from the browser surface  
**And** subsequent Hokim requests are denied  
**And** an existing session cannot bypass Cancellation  
**And** the authenticated Product Owner retains only the operational Console access permitted during cancellation while retained data remains authorized, unexpired, and not deleted.

**Given** a District remains Cancelled before its live-deletion deadline  
**When** the Product Owner reviews its subscription detail  
**Then** the exact cancellation time and live-deletion deadline remain visible  
**And** the permitted recovery window is clear  
**And** normal 90-day Topic/evidence retention continues independently  
**And** Cancellation does not freeze or extend content retention.

**Given** the District is still before its live-deletion deadline  
**When** the Product Owner chooses Start Recovery  
**Then** the exact District and recovery consequences are confirmed  
**And** the operation cancels the pending final live-deletion schedule only if recovery starts successfully  
**And** the District enters Setup incomplete  
**And** production intake, AI processing, and Hokim access remain disabled  
**And** the old removed bot credential is not restored.

**Given** recovery has started  
**When** the Product Owner configures Telegram access  
**Then** a new bot token must be entered and validated through the existing secure Telegram/onboarding capability  
**And** the prior cancelled token cannot be recovered from browser state, Audit History, logs, or stored plaintext  
**And** the secret-entry transaction follows the existing bot-token security contract.

**Given** a recovering District has some data that expired under normal retention before recovery completes  
**When** the Product Owner reviews or completes recovery  
**Then** expired data remains unavailable  
**And** recovery restores no data already removed through normal retention  
**And** remaining unexpired retained data may continue under the ordinary District authorization contract.

**Given** recovery setup is incomplete  
**When** the Product Owner attempts to reactivate the District  
**Then** activation remains blocked until every required activation check established by FR20 succeeds  
**And** recovery does not create a weaker alternative activation path  
**And** Telegram validation, mapping, Hokim-account, disclosure, isolation, configuration, and other existing activation prerequisites remain authoritative.

**Given** every required activation check succeeds during recovery  
**When** the Product Owner explicitly activates the recovered District  
**Then** the District and subscription return to Active atomically  
**And** new Telegram intake, AI processing, and Hokim access resume prospectively  
**And** processing begins only with new Telegram messages received after reactivation  
**And** messages missed during Cancellation or recovery setup are not fetched, reconstructed, backfilled, or replayed  
**And** completed historical decisions are not reassessed solely because the District was recovered.

**Given** the live-deletion deadline has already been reached and authoritative live deletion has completed  
**When** recovery is requested  
**Then** product recovery is unavailable  
**And** no UI or API path can return that District to Active through this recovery workflow  
**And** the Product Owner receives a specific sanitized explanation.

**Given** Cancellation, Start Recovery, or final reactivation is submitted more than once  
**When** duplicate or retry requests are processed  
**Then** each logical lifecycle action produces at most one authoritative business effect  
**And** duplicate deletion schedules, duplicate recovery transitions, or duplicate audit effects are prevented  
**And** stale requests cannot overwrite a newer lifecycle state.

**Given** cancellation, recovery start, validation, or reactivation fails before authoritative completion  
**When** the Product Owner receives the result  
**Then** no partial lifecycle state is reported as successful  
**And** the currently authoritative state remains visible  
**And** errors use the sanitized application contract  
**And** resident content, credentials, raw Telegram tokens, infrastructure objects, and provider-native errors remain hidden.

**Given** lifecycle operations in this story occur  
**When** Audit History records them  
**Then** Cancellation, deletion scheduling, recovery start, relevant recovery-validation results, and reactivation are recorded as immutable append-only events  
**And** records contain only privacy-safe operational metadata and permitted reason text  
**And** raw resident evidence and credentials are excluded.

**Given** browser connectivity is lost during cancellation or recovery  
**When** an authoritative result cannot be confirmed  
**Then** the operation remains unconfirmed  
**And** no destructive or lifecycle action is queued for automatic replay  
**And** reconnect revalidates session, Product Owner authority, explicit District scope, retention status, and current lifecycle state before another action is allowed.

**Given** Story 6.3 is verified  
**When** focused automated and browser checks run  
**Then** integration tests cover high-assurance cancellation, exact 30-day deletion scheduling, immediate service/access enforcement, token removal, normal-retention continuation, recovery eligibility, deletion-schedule cancellation, Setup-incomplete recovery, activation-gate reuse, future-message-only reactivation, stale/duplicate transition safety, and authorization  
**And** browser tests cover consequence preview, reason and typed-name confirmation, destructive keyboard protection, Cancelled timeline state, Start Recovery, incomplete recovery blockers, successful reactivation, failure handling, and offline mutation blocking.

### Story 6.4: Execute and Verify Permanent Live-System District Deletion

As the **Product Owner**,  
I want a Cancelled District to be permanently deleted from live systems at its scheduled deadline with verifiable proof,  
So that offboarded District data does not remain accessible beyond the approved cancellation window.

**FRs:** FR32.

**Acceptance Criteria:**

**Given** a District remains Cancelled when its authoritative 30-day live-deletion deadline is reached  
**When** the deletion workflow becomes eligible to run  
**Then** it verifies the District is still Cancelled  
**And** verifies no successful recovery has invalidated the deletion schedule  
**And** operates only against the explicitly identified District  
**And** a stale cancellation job cannot delete a recovered or reactivated District.

**Given** live deletion begins for an eligible District  
**When** District-owned live data is removed  
**Then** all remaining District data is removed from live product systems, including remaining Topic/Evidence data, configuration, configuration history, District/account records, subscription metadata and notes, operational records, retained audit details, and stored credentials  
**And** normal retention that already removed data is not reversed or reconstructed  
**And** deletion never requires historical Telegram replay or data recovery.

**Given** data shared by infrastructure across Districts exists  
**When** one District is deleted  
**Then** only records belonging to the target District are deleted  
**And** other Districts remain unaffected  
**And** every repository or background operation used by deletion preserves explicit District scope.

**Given** deletion includes records with dependencies  
**When** the workflow executes  
**Then** deletion ordering or transactional boundaries prevent orphaned accessible District data  
**And** partial progress is persisted only through explicitly defined retry-safe milestones  
**And** the system never reports the whole live deletion as successful until every required live-system milestone is verified.

**Given** the deletion worker is retried after timeout, restart, duplicate scheduling, or uncertain completion  
**When** the same logical deletion runs again  
**Then** already-completed milestones can be safely reverified  
**And** repeated execution does not recreate data or cause cross-District effects  
**And** one logical District deletion produces one final live-deletion result.

**Given** live deletion completes successfully  
**When** completion is verified  
**Then** the authoritative actual live-deletion timestamp is recorded  
**And** the District can no longer be recovered through the product  
**And** Product Owner and Hokim access to deleted District content is impossible  
**And** no deleted District content remains browsable through normal Console functionality.

**Given** live deletion succeeds  
**When** the system persists the surviving deletion record  
**Then** only a minimal content-free deletion tombstone/proof remains outside the deleted District's restorable live data  
**And** it contains only permitted metadata required for deletion verification  
**And** it contains no resident messages, evidence, usernames, bot tokens, credentials, payment details, subscription notes, or other private District content.

**Given** the surviving deletion proof crosses the operational-history/API/browser boundary  
**When** its contract and read-only presentation are defined  
**Then** Story 6.4 extends Epic 4's existing Audit History shared contract with an explicit permanent-deletion-proof discriminator and content-free proof schema rather than requiring Epic 4 to prebuild a future deletion type  
**And** ordinary operational audit records remain distinguishable from permanent deletion proofs  
**And** only the approved privacy-safe proof metadata can be returned through that discriminator  
**And** Product Owner proof presentation reuses the established read-only operational-history boundary where applicable without recreating deleted District detail.

**Given** the Product Owner reviews a successfully live-deleted District's deletion proof  
**When** the proof is displayed  
**Then** it can identify the District by the minimum approved identifier/name metadata  
**And** shows the cancellation approver and cancellation time where required  
**And** shows the scheduled and actual live-deletion timestamps  
**And** shows the live-deletion result  
**And** shows the protected-backup expiry deadline  
**And** clearly distinguishes live deletion as complete from protected-backup expiry as a separate pending or completed milestone.

**Given** the District's normal 90-day Topic/Evidence retention expires before its 30-day cancellation deletion deadline  
**When** ordinary retention processing runs  
**Then** those records are deleted at their normal earlier expiry  
**And** Cancellation never extends their lifetime until the live-deletion deadline  
**And** the later District deletion simply removes whatever District data still remains.

**Given** any required live-deletion milestone fails or cannot be verified  
**When** the workflow exhausts its safe retry path or reaches an unresolved state  
**Then** deletion is not marked successfully complete  
**And** the affected condition is surfaced through the existing System Health capability as Critical  
**And** the Product Owner can identify the affected District and failed deletion milestone without exposing deleted/private content  
**And** recovery of the deletion workflow can safely retry/reverify from persisted progress.

**Given** a deletion failure is shown in System Health  
**When** operational details are presented  
**Then** they use privacy-safe diagnostic metadata only  
**And** exclude resident content, usernames, credentials, secrets, or raw infrastructure payloads  
**And** Subscription lifecycle state remains distinct from technical deletion-health status.

**Given** live deletion has already been verified  
**When** a late recovery, activation, lifecycle, or District-content request arrives  
**Then** it cannot recreate the deleted District through normal application flows  
**And** the deletion tombstone prevents stale restored/application state from being treated as a valid recoverable District  
**And** the request fails safely with sanitized operational feedback.

**Given** deletion starts while the Product Owner has District-specific operational content open  
**When** deletion becomes authoritative  
**Then** later requests cannot return deleted content  
**And** any client state that is no longer authorized is removed according to the existing security-precedence UI rules  
**And** stale responses cannot repopulate the deleted District interface.

**Given** Story 6.4 is verified  
**When** focused automated and operational tests run  
**Then** they cover cancellation-deadline eligibility, recovery/deletion races, explicit District isolation, complete live-data removal, ordinary-retention interaction, retry/idempotency behavior, minimal tombstone persistence, proof metadata, permanent-deletion-proof discriminator/schema integration with the existing Audit History contract, post-deletion access denial, and Critical health on incomplete deletion  
**And** destructive-path tests demonstrate that another District's records cannot be deleted by supplying or manipulating the wrong District identifier  
**And** browser tests cover deletion-status/proof presentation and the distinction between completed live deletion and still-pending backup expiry.

### Story 6.5: Verify Protected-Backup Expiry and Reconcile Disaster Restores

As the **Product Owner**,  
I want deleted District data to age out of protected backups and remain deleted after disaster recovery,  
So that permanent deletion remains trustworthy even when infrastructure backups or restored historical database state are involved.

**FRs:** FR32.

**Acceptance Criteria:**

**Given** a District has completed live-system deletion  
**When** its protected-backup lifecycle is evaluated  
**Then** backups capable of containing that District's deleted data remain subject to the approved backup-expiry window  
**And** the backup-expiry deadline is independently tracked from the already-completed live-deletion milestone  
**And** the backup lifecycle never extends the District's product recovery window.

**Given** a protected backup may contain data from a District whose live deletion completed  
**When** the approved backup retention window expires  
**Then** the relevant backup material expires according to the infrastructure retention policy  
**And** deleted District data cannot remain restorable through protected production backups beyond that approved window  
**And** expiry occurs no later than the approved maximum of 30 additional days after live deletion.

**Given** protected backup expiry is expected for a deleted District  
**When** the expiry milestone is evaluated  
**Then** the system independently verifies whether the required backup-retention condition has actually been satisfied  
**And** does not infer success merely from elapsed time  
**And** records the verification result and actual verification time in the surviving privacy-safe deletion proof.

**Given** backup expiry is successfully verified  
**When** the Product Owner reviews the deletion proof  
**Then** the proof shows live deletion as completed  
**And** shows the protected-backup expiry deadline  
**And** shows the actual backup-expiry verification time  
**And** shows the backup-expiry result  
**And** shows the overall deletion lifecycle as complete only after both live deletion and backup expiry are verified  
**And** the surviving proof remains content-free and excludes resident messages, evidence, usernames, credentials, bot tokens, private subscription notes, payment data, and other deleted District content.

**Given** backup expiry cannot be verified, fails, or remains incomplete beyond its required deadline  
**When** the condition is detected  
**Then** the deletion lifecycle is not reported as fully complete  
**And** the existing System Health capability exposes the condition as Critical  
**And** the affected deletion/backup-expiry milestone is identifiable using privacy-safe operational metadata  
**And** resident or deleted content is not exposed for diagnosis.

**Given** backup-expiry verification is retried after timeout, infrastructure uncertainty, or process restart  
**When** verification runs again  
**Then** it is safe to repeat  
**And** an already-verified milestone is not duplicated or contradicted  
**And** the latest authoritative infrastructure result determines whether the milestone is complete  
**And** one logical backup-expiry milestone produces one final business result.

**Given** the Product Owner uses the Console after live deletion  
**When** backup copies still exist within their protected retention window  
**Then** those backups cannot be browsed as District content through the Console  
**And** cannot be used by normal product workflows to recover, inspect, or reactivate the deleted District  
**And** product recovery remains permanently unavailable after live deletion.

**Given** a disaster requires PostgreSQL/application state to be restored from a backup containing historical data  
**When** the restore completes at the infrastructure level  
**Then** normal product access remains blocked until deletion and retention reconciliation succeeds  
**And** restored historical database state is not immediately considered authoritative product-visible state.

**Given** restored database state contains a District identified by the surviving deletion tombstone as already live-deleted  
**When** restore reconciliation runs  
**Then** that District's restored application data is removed again before normal access is enabled  
**And** the District cannot become Active, recoverable, or browsable because an older backup predates its deletion  
**And** restored subscription/configuration state cannot override the external deletion proof.

**Given** restored database state contains Topic, Evidence, or other retained records whose ordinary retention deadlines passed while the system was unavailable or since the backup was created  
**When** restore reconciliation runs  
**Then** existing retention rules are reapplied before those records become accessible  
**And** expired records are removed  
**And** restoration does not reset or extend their original retention lifetime.

**Given** the restore contains unfinished jobs, queued work, or historical lifecycle state  
**When** reconciliation completes  
**Then** jobs are evaluated against the reconciled current District existence, lifecycle, authorization, and retention state before any external or AI side effect  
**And** deleted District work cannot resume  
**And** expired content cannot be processed  
**And** completed historical decisions are not replayed merely because an older backup was restored.

**Given** deletion reconciliation removes a restored District  
**When** the external deletion tombstone already proves its prior deletion  
**Then** reconciliation does not create a second logical cancellation or deletion event  
**And** the surviving deletion proof remains the authoritative continuity record  
**And** operational verification may record that restore reconciliation was successfully applied without restoring deleted private data into permanent audit storage.

**Given** restore reconciliation fails or cannot prove that deletion and retention rules were reapplied safely  
**When** the system evaluates readiness for normal access  
**Then** normal application access remains blocked  
**And** the failure is surfaced through System Health as a Critical recovery condition  
**And** the system fails closed rather than exposing potentially resurrected deleted or expired data.

**Given** disaster recovery completes successfully  
**When** normal access is re-enabled  
**Then** all deletion tombstones applicable to the restored point have been reconciled  
**And** all required retention processing has been reapplied  
**And** deleted Districts remain unavailable  
**And** authorized surviving Districts operate under their current reconciled lifecycle state.

**Given** recovery objectives are verified operationally  
**When** disaster-recovery tests are performed  
**Then** deletion/retention reconciliation is included within the approved recovery procedure  
**And** it is compatible with the architecture's RPO <= 1 hour and RTO <= 8 hours objectives rather than being an optional post-recovery cleanup step.

**Given** Story 6.5 is verified  
**When** focused automated and operational checks run  
**Then** they cover independent backup-expiry deadlines, successful and failed expiry verification, retry-safe/reverification behavior, Critical health on overdue or unverifiable expiry, inability to browse or recover deleted content from backups, restore access blocking, deletion-tombstone reconciliation, ordinary-retention reconciliation, stale-job suppression, idempotent repeated reconciliation, fail-closed behavior when reconciliation fails, and disaster-recovery drill coverage within the approved recovery objectives.
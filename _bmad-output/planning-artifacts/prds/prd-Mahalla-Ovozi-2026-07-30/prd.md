---
title: 'Mahalla Ovozi Product Requirements Document'
status: complete
created: '2026-07-30'
updated: '2026-08-15'
---

# Mahalla Ovozi Product Requirements Document

## 1. Vision

Mahalla Ovozi helps a Hokim understand relevant service and Hokim-related signals from authorized district Telegram groups without manually reading every message. It organizes related evidence into cautious, traceable Topics while leaving every real-world decision and response to the Hokim.

The product reduces manual message reading and delivers useful signals rather than verified facts. It preserves the evidence behind every Topic and does not become a complaint portal, case-management system, or automated decision-maker.

## 2. Target User

### 2.1 Jobs To Be Done

- **Hokim:** When time is limited and reading every Telegram-group message is impractical, help me quickly understand relevant situations being discussed across my district and inspect their supporting evidence, so I can independently decide whether any response is needed.
- **Product Owner:** When I operate Mahalla Ovozi for several customer districts, help me configure, monitor, maintain, and commercially manage every deployment from one private Console, so I can keep the service reliable without manually inspecting each system.

### 2.2 Non-Users for MVP

- Residents and Telegram-group members are evidence sources, not application users.
- The public cannot register or submit complaints through Mahalla Ovozi.
- District staff, reviewers, mahalla administrators, and service organizations do not receive accounts or workflows.
- The MVP has no separate district-admin or technical-operator role.
- Only the district's Hokim and the Product Owner use the application.

### 2.3 Key User Journeys

#### UJ-1: Hokim Akmal understands current district signals

- **Persona and context:** Hokim Akmal has a changing daily schedule. He opens Mahalla Ovozi whenever his work allows.
- **Entry state:** He is authenticated in his private district dashboard.
- **Path:**
  1. Akmal sees the complete five-lane district overview.
  2. New or recently updated Topics are easy to notice.
  3. He opens a Topic and reads its cautious AI-generated summary, mahalla, and lane information.
  4. When needed, he opens the evidence drawer and reviews supporting Telegram messages and available source links.
- **Climax:** Within a short time, Akmal understands a potentially important situation and sees the evidence behind it.
- **Resolution:** Akmal independently decides whether to act, how to act, or not to act. Mahalla Ovozi does not recommend or track his decision.
- **Edge case:** If the summary appears unclear or wrong, Akmal reviews the evidence himself. Processing failures are shown honestly. He cannot manually edit or approve Topics in the MVP.

#### UJ-2: Product Owner Zubaydulla checks operational health

- **Persona and context:** Zubaydulla is the Product Owner and technical maintainer responsible for all customer deployments.
- **Entry state:** He is authenticated in the Product Owner Console.
- **Path:**
  1. Zubaydulla opens the Console Overview and sees status across all districts.
  2. He notices a warning for one district and opens System Health.
  3. He reviews the affected bot, group, processing backlog, last successful activity, and failure details.
  4. He follows the link to the correct management section.
  5. If a risky configuration change is needed, the system asks for confirmation and records it in Audit History.
- **Climax:** Zubaydulla knows whether every customer district is operating correctly and understands what needs attention and where to manage it.
- **Resolution:** He resolves supported operational problems inside the Console or uses external engineering tools when deeper investigation is required.
- **Edge cases:**
  - A quiet group is not labelled disconnected without technical evidence.
  - A subscription pause is shown as a subscription state, not as a technical failure.
  - If the Console cannot fix the problem, it provides a clear reason and the next technical area to inspect.

#### UJ-3: Zubaydulla onboards a new district

- **Persona and context:** Zubaydulla has approved customer information and is responsible for configuring the district.
- **Entry state:** He is authenticated in the Product Owner Console and starts a new district setup.
- **Path:**
  1. Zubaydulla creates the district record.
  2. He sets its subscription state.
  3. He adds the district's unique Telegram bot token.
  4. He adds approved Telegram groups and maps each group to its mahalla.
  5. He creates the district's Hokim account.
  6. He runs bot-access, group-configuration, and district-isolation checks.
  7. He activates message processing and Hokim access only after every required check passes.
- **Climax:** Zubaydulla confirms that the district is correctly isolated, connected, and ready to process authorized Telegram messages.
- **Resolution:** The Hokim can sign in and see only that district's dashboard. Processing begins for the configured groups.
- **Edge case:** If setup is incomplete, the Console preserves the entered configuration, marks the district **Setup incomplete**, shows the remaining problems, and keeps processing and Hokim access disabled until Zubaydulla finishes successfully.

#### UJ-4: Zubaydulla manages a district subscription lifecycle

- **Persona and context:** Zubaydulla manages subscriptions manually because payment occurs outside Mahalla Ovozi.
- **Entry state:** He is authenticated in the Product Owner Console and opens the district's subscription section.
- **Path:**
  1. For an overdue subscription, Zubaydulla starts the seven-day **Grace** period.
  2. The Console records the Grace dates, continues service, and displays renewal warnings.
  3. If renewed, Zubaydulla returns the district to **Active**.
  4. If not renewed, the system automatically changes the district to **Suspended** after Grace expires.
  5. Suspended service stops new ingestion, processing, and Hokim access while temporarily retaining district data.
  6. If participation ends, Zubaydulla selects **Cancelled** and confirms the consequences.
  7. The stored bot token is removed, and the Console displays the exact live-deletion date and protected-backup expiry rule.
  8. Zubaydulla may restore the district during the 30-day recovery period. Otherwise, the system deletes the District from live systems, schedules expiry of protected backup copies, and audits the deletion.
- **Climax:** Zubaydulla always understands the district's commercial state and its exact effect on service, access, recovery, and deletion.
- **Resolution:** The District is Active, temporarily Suspended, restored, or removed from live operation with backup expiry controlled by the confirmed lifecycle.
- **Edge cases:**
  - Reactivation resumes future messages only; it does not backfill messages missed while Suspended.
  - Previously completed production decisions are never replayed.
  - After live deletion, restoration through the product is impossible; a disaster restore must reapply the deletion before access.

#### UJ-5: Hokim Akmal reviews earlier district signals

- **Persona and context:** Akmal wants to find and understand signals from an earlier date or period.
- **Entry state:** He is authenticated in the same unified district dashboard used for current monitoring.
- **Path:**
  1. Akmal changes the date or selects a date range.
  2. The five-lane board, evidence, and statistics update together.
  3. He optionally narrows results by mahalla and lane/category.
  4. He searches plain text across retained Topic summaries, evidence, usernames, and display names.
  5. He opens a matching Topic and reviews its supporting evidence.
- **Climax:** Akmal quickly finds the earlier situation and its retained evidence without navigating to a separate History page.
- **Resolution:** He understands the historical signal and independently decides whether it has any current relevance.
- **Edge cases:**
  - Large result sets load progressively inside each lane.
  - Telegram source navigation may fail, but retained evidence remains usable.
  - Expired information is unavailable after its 90-day retention period.
  - Search does not provide AI-generated semantic answers or automatically reassess historical messages.

## 3. Glossary

- **District** — One isolated customer deployment for one Hokim, with its own data, account, bot token, groups, configuration, and subscription.
- **Mahalla** — A local area inside a District. Authorized Telegram groups are mapped to their correct Mahalla.
- **Accepted Evidence** — A Telegram message that passes relevance analysis and is retained as the source material behind a Topic.
- **Topic** — One same-day situation built from related Accepted Evidence. A Topic never continues or merges across different days.
- **Lane** — One of the five dashboard groupings: Water, Electricity, Gas, Waste, or Hokim-related. One Topic may appear in multiple applicable Lanes.

## 4. Features

### 4.1 Authorized Telegram Intake

**Description:** Each District receives supported human messages from approved groups through its own passive bot. Structural checks remove unsupported content before AI use, semantic analysis decides relevance, and only qualifying messages become Accepted Evidence. Realizes UJ-1 and supports the gated setup in UJ-3.

**Functional Requirements:**

#### FR-1: District-specific passive bot

The Product Owner can configure one District-owned Telegram bot for each District, and the product accepts messages only from that District's approved groups.

**Consequences (testable):**
- Each active District has a unique bot token that is not shared with another District.
- The bot operates as a silent, non-admin group member and never sends, moderates, or manages group content.
- Telegram Group Privacy Mode is disabled for the bot, and activation proves that it receives an ordinary non-command message from every approved group.
- Content from an unapproved group or a bot associated with another District does not proceed to AI analysis.

#### FR-2: Supported content intake and structural exclusions

The product can admit supported human text and textual captions from approved groups while excluding unsupported content before AI analysis.

**Consequences (testable):**
- Human text and textual captions can proceed to semantic relevance analysis.
- Commands, bot messages, empty content, captionless media, audio, OCR, documents, file contents, and content from unapproved groups do not proceed to AI analysis.
- Messages marked by Telegram as forwarded do not proceed to AI analysis and are not retained.
- A separate non-forwarded reply to a forwarded message can proceed only when the reply contains a self-contained signal; the forwarded parent is not used as context.

#### FR-3: Semantic relevance decision

The product can use AI meaning analysis to decide whether structurally supported content is relevant, with configured multilingual vocabulary used only as guidance.

**Consequences (testable):**
- A configured term never forces a message to become Accepted Evidence.
- A message without a configured term can become Accepted Evidence when its meaning qualifies.
- Vocabulary guidance can include Uzbek and Russian, Latin and Cyrillic forms, jargon, abbreviations, common typos, and informal terms.
- A direct configured Hokim reference or a clear semantic reference to District leadership can qualify as Hokim-related; a vague phrase such as "responsible people" does not qualify without connecting context.
- A complaint outside Water, Electricity, Gas, and Waste, such as a road problem, can qualify as Hokim-only when it clearly concerns the Hokim or District leadership.

#### FR-4: Relevance exclusions and disposal

The product excludes non-qualifying content and immediately discards it rather than retaining it for later production reassessment.

**Consequences (testable):**
- Planned announcements, advertisements, pure speculation, neutral Hokim mentions, and praise are excluded unless the message independently contains a qualifying reported situation, complaint, or meaningful Hokim-related concern.
- Irrelevant content does not become Accepted Evidence and is not retained for automatic reconsideration.
- A missed relevant signal cannot be restored from discarded production content.

#### FR-5: Telegram message-state handling

The product preserves the originally captured state and Telegram timestamp of Accepted Evidence.

**Consequences (testable):**
- A later Telegram edit does not rewrite captured Accepted Evidence or completed AI decisions.
- Telegram deletion does not remove captured Accepted Evidence before its Topic expires.
- Delayed processing or retry uses the original Telegram timestamp rather than the retry time.

#### FR-6: Duplicate-safe and retry-safe intake

The product can safely handle duplicate delivery and retry incomplete processing without duplicating completed work.

**Consequences (testable):**
- Repeated delivery of the same Telegram message produces at most one retained evidence record and one committed result for the same processing configuration.
- Only work that did not complete is eligible for retry.
- Completed production processing is never replayed merely because Telegram redelivers a message or a worker restarts.

### 4.2 AI Topic Analysis and Evidence

**Description:** The product organizes Accepted Evidence into same-day Topics, derives cautious and traceable Topic information, and presents one canonical Topic in every applicable Lane. Complete evidence and explicit failures take priority over plausible-looking but incomplete AI output. Realizes UJ-1.

**Functional Requirements:**

#### FR-7: Daily Topic identity and seeding

The product can create a Topic for one underlying situation within one District, one Mahalla, and one Uzbekistan calendar day when a self-contained signal qualifies.

**Consequences (testable):**
- Topic matching resets at Uzbekistan midnight without cross-day continuation or reply exceptions.
- Accepted Evidence from different Districts, Mahallas, or calendar days cannot belong to the same Topic.
- A vague fragment cannot create a new Topic without a self-contained signal.

#### FR-8: Same-day Topic matching

The product can connect Accepted Evidence to the correct same-day Topic using reliable message relationships and meaning.

**Consequences (testable):**
- Direct Telegram reply metadata takes priority when resolving Topic membership.
- Without a direct reply, a vague follow-up can use the nearest earlier same-day Topic-linked message only when the meaning fits.
- The product does not attach a vague fragment when no reliable connection exists.
- Time gaps, restoration reports, recurrence, and contradictory reports can remain in one Topic when they clearly concern the same situation.

#### FR-9: Complete same-day evidence context

The product uses the candidate supported message, when applicable, together with all raw Accepted Evidence from every same-day Topic in the same Mahalla for production AI analysis that depends on same-day Mahalla context.

**Consequences (testable):**
- Irrelevant chat, old AI summaries, vector retrieval, and a separate recent-message window do not replace the required context.
- The complete deterministic same-day snapshot applies to contextual relevance interpretation, Topic matching, Lane derivation, and Topic-derived-field recalculation.
- Older same-day Accepted Evidence is not silently truncated to fit an AI or cost limit.
- If complete required context cannot fit an approved limit, the operation produces an explicit failure and no incomplete result is committed.

#### FR-10: Canonical multi-Lane Topic

The product maintains one canonical Topic that can appear in every applicable service and Hokim-related Lane.

**Consequences (testable):**
- Displaying one Topic in multiple Lanes does not create duplicate Topics or duplicate Accepted Evidence.
- Lane membership recalculates when Accepted Evidence changes.
- A Hokim-related complaint can produce a Hokim-only Topic or overlap with any applicable service Lane.

#### FR-11: Cautious derived Topic information

The product recalculates Topic summary, Lane membership, anchor, latest activity, attribution, and Hokim-related status from current Accepted Evidence.

**Consequences (testable):**
- Summaries use cautious Uzbek Cyrillic attribution, preserve disagreement and changing reports, and never present a resident report as a verified fact.
- A report that service returned does not become a verified resolution statement.
- The Topic anchor is the latest self-contained meaningful evidence, not the newest vague fragment or a claimed truth or resolution.
- When new Accepted Evidence arrives, Topic-derived fields may recalculate from the complete current evidence snapshot using the then-active configuration version without rerunning older message-level decisions.

#### FR-12: Evidence integrity and retention

The product preserves Accepted Evidence as the source of truth and retains it with its Topic for the complete retention period.

**Consequences (testable):**
- Evidence identity displays the Telegram username when available, otherwise the display name, and never infers or displays a phone number.
- Evidence count means retained-message count; repeated messages from one sender are not described as reports from several residents.
- A Topic and all its Accepted Evidence expire together 90 days after the Topic's latest relevant evidence timestamp.
- Individual Accepted Evidence does not expire earlier while its Topic remains retained.

#### FR-13: Explicit AI failure and traceability

The product commits an AI-derived result only when it is valid and traceable to the evidence and AI configuration that produced it.

**Consequences (testable):**
- Invalid structured output, refusal, context overflow, timeout, rate limit, and provider failure remain explicit failures rather than plausible-looking success.
- Partial or invented summaries and Topic updates are not committed.
- Each committed result records the exact AI configuration version and required attempt context for Product Owner investigation.
- Failures are available to System Health and remain eligible only for duplicate-safe handling under FR-6.

### 4.3 Hokim Dashboard and History

**Description:** The Hokim uses one stable monitoring surface to scan current Topics, inspect Accepted Evidence, and review retained history without moving between dashboard and History pages. Filters, statistics, freshness, and background updates remain coordinated. Realizes UJ-1 and UJ-5.

**Functional Requirements:**

#### FR-14: Unified five-Lane Hokim dashboard

The Hokim can use one unified District dashboard containing a compact sticky toolbar and five independently scrolling Lanes.

**Consequences (testable):**
- The Hokim interface has no sidebar, global navigation row, page-navigation tabs, or separate History page.
- The sticky toolbar provides brand, fixed District context, date and Mahalla filters, plain-text search, freshness, Help, and profile controls.
- All five Lanes remain visible together at normal desktop widths.
- Smaller widths use horizontal board scrolling rather than shrinking Topic cards below readable widths.
- Each Lane keeps a fixed header and independently scrolls its Topic cards.

#### FR-15: Topic cards and evidence drawer

The Hokim can scan concise Topic cards and open a right-side drawer to verify the complete Accepted Evidence trail.

**Consequences (testable):**
- A Topic card shows its cautious summary, Mahalla, latest meaningful activity, retained evidence count, and new or recently updated state.
- The evidence drawer presents Accepted Evidence chronologically with original text, username or display name, and Telegram timestamp.
- Each evidence item offers a best-effort **Open in Telegram** action when a source link is available.
- A failed Telegram navigation does not hide or invalidate retained Accepted Evidence.
- Opening or closing the drawer and receiving a background refresh preserves every Lane's scroll position and the Hokim's review context.

#### FR-16: Stable background refresh and freshness

The dashboard can refresh Topic data in the background while preserving the Hokim's active view and communicating data freshness honestly.

**Consequences (testable):**
- Background refresh does not reset active filters, Lane scroll positions, or an open evidence drawer.
- The toolbar shows the last successful dashboard update.
- A processing delay produces a visible warning that recent messages may not yet appear.
- The interface does not claim real-time freshness when AI processing is delayed.
- New or recently updated Topics remain visually discoverable after refresh.

#### FR-17: Retained history, filtering, and search

The Hokim can review current and retained Topics within the same dashboard by combining date, Mahalla, Lane/category, and plain-text criteria.

**Consequences (testable):**
- The dashboard defaults to Today and supports complete-day dates and date ranges within the retained 90-day window.
- Plain-text search covers retained Topic summaries, Accepted Evidence, Telegram usernames, and display names within the Hokim's District.
- Date/date range, Mahalla, Lane/category, and plain-text criteria can be combined.
- Large result sets load progressively within each Lane instead of loading the full retained window at once.
- The MVP provides neither hourly filtering nor AI semantic question search.

#### FR-18: Filter-aware neutral statistics

The dashboard can summarize the active result set through five compact statistics cards without implying service quality or representative public opinion.

**Consequences (testable):**
- The strip shows unique Topics with equivalent prior-period comparison, Hokim-related Topics, active Mahallas with evidence count as secondary context, most active service Lane, and most active Mahalla or an adaptive replacement.
- Statistics follow active date and Mahalla filters.
- "Most active" uses unique Topic count rather than message volume.
- A multi-Lane Topic counts once in every applicable service Lane; Hokim-related remains separate and overlapping.
- When a metric becomes meaningless under active filters, the product replaces it with another useful metric.
- Trend direction remains neutral and the MVP provides no AI sentiment or public-opinion statistics.

### 4.4 Product Owner Console and District Management

**Description:** Product Owner Zubaydulla uses one private Console to onboard and manage Districts, Telegram connections, Hokim access, future AI configuration, and immutable operational records. Incomplete or invalid setup cannot silently become active. Realizes UJ-3 and establishes the management controls used by UJ-2 and UJ-4.

**Functional Requirements:**

#### FR-19: Unified Product Owner Console

Zubaydulla can manage every District from one authenticated Product Owner Console organized into focused operational sections.

**Consequences (testable):**
- The Console provides Overview, System Health, Districts, Telegram Setup, Subscriptions, Hokim Accounts, AI Operations, and Audit History sections.
- Only the Product Owner can access the Console or view information across Districts.
- Zubaydulla can select one District and browse or search its retained Topics and Accepted Evidence for operations and troubleshooting; a single view or search never mixes evidence from different Districts.
- The MVP introduces no additional admin, support, or District-staff roles.
- Moving between Console sections preserves the selected District when that context remains applicable.

#### FR-20: Gated and resumable District onboarding

Zubaydulla can create a District, save incomplete setup, and activate it only after every required onboarding check passes.

**Consequences (testable):**
- Onboarding covers District identity, externally managed subscription state, the District's unique Telegram bot, Telegram group-to-Mahalla mapping, one Hokim account, and required configuration checks.
- Onboarding records confirmation that the customer arrangement disclosed Zubaydulla's standing operational access to that District's retained Topics and evidence.
- Partially completed onboarding is saved as **Setup incomplete** and can be resumed.
- A Setup-incomplete District performs no production message intake or AI processing and gives no Hokim access.
- Activation requires successful bot access, mapping, account, subscription, and required configuration checks.
- Activation and failed activation attempts are audited with actionable failure reasons.

#### FR-21: Telegram bot, group, and Mahalla management

Zubaydulla can manage one validated Telegram bot per District and a one-to-one relationship between approved Telegram groups and Mahallas.

**Consequences (testable):**
- Only the Product Owner can add, replace, or remove a District bot token, and the full stored secret is never redisplayed.
- A token is validated before activation; after successful replacement, the previous token stops future intake and the new token affects future intake only.
- Each approved Telegram group belongs to exactly one District and maps to exactly one Mahalla; each enabled participating Mahalla in an Active District has exactly one approved active Telegram group.
- A Mahalla can have no active group only while its setup is incomplete or the Mahalla/group is explicitly disabled.
- The product prevents assigning a second approved group to a Mahalla that already has one.
- Bot access, disabled Group Privacy Mode, and receipt of an ordinary non-command test message are verified before a mapping becomes Active.
- Disabling, removing, replacing, or remapping a group affects future intake only; retained evidence keeps its original District and Mahalla history.
- Token and mapping additions, replacements, removals, disables, and remaps are audited with secrets redacted.

#### FR-22: Hokim account and District access boundary

Zubaydulla can create, reset, disable, or replace the single active Hokim account assigned to a District.

**Consequences (testable):**
- Each District has at most one active Hokim account and a Hokim cannot self-register.
- A Hokim account cannot change its own District assignment.
- Successful Hokim authorization resolves deterministically to that account's District and exposes no other District's data.
- Disabling or replacing an account removes the old account's access immediately.
- Account lifecycle actions and failed authorization attempts are audited without exposing credentials.

#### FR-23: Versioned future-only analysis configuration

Zubaydulla can manage and roll back global analysis settings and District-specific recognition vocabulary through explicit, versioned, future-only changes.

**Consequences (testable):**
- Product Owner Settings hold the versioned model, prompt, global service vocabulary, and other relevant analysis configuration.
- District Settings hold Hokim recognition terms and optional local vocabulary additions.
- Every activated change records its exact version and activation time.
- Configuration changes never rerun older message-level relevance, Lane, or Topic-assignment decisions and never rewrite committed historical results.
- New Accepted Evidence may update a retained same-day Topic's derived fields using the then-active configuration, while every committed result preserves exact configuration lineage.
- Zubaydulla can restore a known earlier configuration version; rollback affects future processing only and does not replay history.
- Risky configuration changes require explicit confirmation and all configuration changes are audited with old and new non-secret values.

#### FR-24: Immutable searchable retained Audit History

Zubaydulla can investigate important product and security events through a read-only Audit History that is immutable while retained.

**Consequences (testable):**
- Audit records identify the actor, time, District when applicable, action, supplied reason, and relevant old and new values.
- Zubaydulla can filter records by District, action type, and date.
- Telegram bot tokens, credentials, and other secrets are redacted rather than stored or displayed as audit values.
- Audit records cannot be edited or deleted through the Console.
- Cross-District access attempts, failed authorization, activation failures, and sensitive management actions remain visible for investigation.
- At final District deletion, FR-32 removes that District's detailed audit records and leaves the minimal deletion proof as the sole permanent tombstone.

### 4.5 System Health and Operational Diagnostics

**Description:** Zubaydulla uses the System Health section of the Product Owner Console to distinguish real technical failures from delays, quiet groups, subscription-caused pauses, and insufficient evidence. The section provides privacy-safe information for investigation without attempting automatic repair. Realizes UJ-2.

**Functional Requirements:**

#### FR-25: Truthful hierarchical health status

The product can report an evidence-based health status for the overall service, each District, and each monitored component without treating silence as failure.

**Consequences (testable):**
- Health uses the states **Healthy**, **Delayed**, **Degraded**, **Unavailable**, **Quiet**, and **Unknown** with a visible last-check time.
- Healthy requires recent successful technical checks and processing evidence.
- Delayed means processing exceeded an operating target; Degraded means failures exist while some operation continues.
- Unavailable requires direct technical evidence that a required component cannot operate.
- A group with no recent messages is Quiet when no technical failure is known, never disconnected or unavailable merely because it is silent.
- A component with insufficient or stale recent evidence is Unknown rather than Healthy.

#### FR-26: Product and District monitoring coverage

Zubaydulla can inspect overall and per-District operational status across the components required to receive, process, retain, and display Topics.

**Consequences (testable):**
- System Health covers Telegram bot and approved-group access, message-intake freshness, processing queues and workers, AI delays and failures, web application, database, storage, retention jobs, and scheduled-deletion jobs.
- Required operational fields include last received-message time, queue depth, oldest queued age, active model and prompt version, processing latency, and processing success and failure counts.
- Each status identifies the affected District and component when applicable.
- Recent errors show their time and a beginner-friendly explanation.
- Subscription state is managed in Subscriptions rather than classified as a technical health failure.
- When subscription state pauses processing or access, System Health states that cause and links the operator to the relevant District's subscription information.

#### FR-27: Actionable in-Console issue lifecycle

The product can present current operational issues inside the Console and resolve them only after recovery is supported by a successful technical check.

**Consequences (testable):**
- Active issues are sorted as **Critical**, **Warning**, or **Information** and identify what failed, what is affected, when it started, the latest check, and a recommended next step.
- An issue remains active while current evidence shows that the problem continues.
- A successful recovery check automatically marks the issue resolved and records both failure and recovery in Audit History.
- Zubaydulla can manually retry failed work only when it has no completed result; retry preserves the original Telegram timestamp and the duplicate-safe boundary in FR-6.
- The MVP requires no manual acknowledgement and sends no Telegram, email, SMS, or pager alert.
- The MVP presents recommended operator steps but performs no automatic repair action.

#### FR-28: Pilot operating targets and privacy-safe diagnostics

The product can evaluate freshness against initial pilot targets and provide diagnostic metadata without exposing production message content or secrets.

**Consequences (testable):**
- An eligible Telegram message has a 5-minute target to enter processing and its related Topic update has a 15-minute target to become available.
- A technical health check older than 10 minutes produces Unknown rather than Healthy.
- Exceeding an operating target produces Delayed or Warning; Critical or Unavailable still requires direct evidence that an essential component cannot operate.
- The targets are pilot operating thresholds, not a public service guarantee, and can be changed through controlled deployment configuration rather than a Console setting.
- Diagnostics may show necessary District, Mahalla, group, processing stage, timestamps, queue/job/trace identifier, AI configuration version, safe error category, and retry or recovery metadata.
- Resident message text is hidden by default; bot tokens, credentials, provider keys, and other secrets are never displayed.
- Technical errors are sanitized before display so raw errors cannot expose message content or secrets.

### 4.6 Subscription Lifecycle and District Deletion

**Description:** Zubaydulla records externally managed subscription status and controls each District's product access through a small, explicit lifecycle. Grace, Suspension, Cancellation, recovery, retention, live deletion, and protected-backup expiry produce visible dates and audited consequences without adding payment processing to the MVP. Realizes UJ-4.

**Functional Requirements:**

#### FR-29: Manually managed subscription record

Zubaydulla can view and manage the product-access status associated with each District while payment remains outside Mahalla Ovozi.

**Consequences (testable):**
- The Subscriptions section shows District, current status, status start date, and the next scheduled transition when one exists.
- Zubaydulla can store an optional external payment reference and internal note.
- The MVP does not collect payments or manage cards, invoices, pricing plans, or automatic billing.
- Every status change displays its operational consequence before confirmation and is recorded in Audit History.
- Subscription state is the source of truth for District product access but is not misreported as a technical failure in System Health.

#### FR-30: Active, Grace, and Suspended operation

Zubaydulla can keep a District Active, manually start a seven-day Grace period, or restore an eligible Grace or Suspended District to Active.

**Consequences (testable):**
- Active and Grace continue new intake, AI processing, and Hokim access.
- Starting Grace records and displays its exact start and automatic expiry time.
- Grace automatically becomes Suspended at expiry unless Zubaydulla restores Active first.
- Suspended stops new intake, AI processing, and Hokim access but retains existing data subject to normal expiry.
- Restoring a Suspended District resumes processing only for future Telegram messages after activation; messages missed while Suspended are not backfilled or replayed.

#### FR-31: Confirmed cancellation and gated recovery

Zubaydulla can Cancel a District with explicit confirmation and can begin recovery before its displayed live-deletion deadline.

**Consequences (testable):**
- Cancellation immediately stops intake, AI processing, and Hokim access; removes the stored Telegram bot token; and schedules live-system deletion exactly 30 days after cancellation.
- Before confirmation, the Console states the exact live-system deletion date, protected-backup expiry deadline, removal consequences, recovery window, and absence of message backfill.
- Starting recovery before the deadline cancels scheduled final deletion and places the District in **Setup incomplete** with production access still stopped.
- Recovery requires a new validated bot token and every required activation check from FR-20 before the subscription and District return to Active.
- Unexpired retained data remains available to the recovery process, while data already removed by normal retention remains unrecoverable.
- Reactivation resumes only from new Telegram messages; messages missed during Cancellation or recovery setup are not fetched, replayed, or reconstructed.
- Cancellation, deletion scheduling, recovery start, validation results, and reactivation are audited.

#### FR-32: Automatic verified District deletion

The product deletes all remaining District data from live systems at the cancellation deadline, expires protected backup copies within the approved backup window, and retains only a minimal content-free proof of the deletion.

**Consequences (testable):**
- Normal 90-day Topic and Accepted Evidence expiry continues during Suspension, Cancellation, and recovery setup; these states never extend content lifetime.
- At the 30-day cancellation deadline, deletion removes remaining Telegram messages, Accepted Evidence, Topics, summaries, history and search data, mappings, District configuration, Hokim account and access, subscription notes and external reference, bot token, District-specific operations data, and District-linked audit detail.
- Live-system deletion and protected-backup expiry are separately verifiable milestones.
- The only retained deletion proof contains the deleted District identifier and name, cancellation approver and time, scheduled and actual live-deletion times and result, protected-backup expiry deadline, and backup-expiry verification time and result.
- The retained proof contains no resident content, usernames, credentials, bot tokens, external payment details, or other deleted private data.
- Encrypted whole-system backups that predate live deletion expire automatically within 30 additional days and cannot be browsed or restored through the Console.
- Any disaster restore reapplies recorded District deletion markers and current normal-retention expirations before user access, so deleted or expired data does not re-enter the accessible product.
- Live deletion and backup expiry are safe to retry or re-verify without duplicating effects, and each milestone is verified before its success is recorded.
- A failed or incomplete live deletion or required backup expiry becomes a Critical System Health issue until that milestone completes safely.

## 5. Non-Functional Requirements

### NFR-1: Capacity envelope

At the MVP design envelope, the product supports up to four Active Districts, 30 Mahallas and approved groups per District, 120 approved groups total, approximately 20,000 structurally valid human text or caption messages per day across all Districts, short bursts around 100 messages per minute, and at least 10 simultaneous authenticated sessions.

- The initial storage plan supports approximately 180,000 retained Accepted Evidence records across the 90-day window.
- Burst intake uses durable queuing and does not lose messages or duplicate completed processing.
- These figures are engineering targets until representative production-shaped load and recovery tests pass; they are not an unverified commercial capacity promise.

### NFR-2: User-facing web performance

At the approved design envelope and under normal production operation:

- The Hokim dashboard and Product Owner Console become usable within three seconds for at least 95% of requests.
- Combined date, Mahalla, Lane, and plain-text filter changes return updated results within two seconds for at least 95% of requests.
- An evidence drawer opens within one second for at least 95% of requests when its retained data is available.
- Large 90-day result sets load progressively rather than blocking the complete screen.
- Background refresh never freezes the screen or resets active filters, Lane scroll positions, or an open drawer.
- AI-processing delay is measured and communicated separately from web-screen response time.

### NFR-3: Durable and duplicate-safe processing

Telegram intake and asynchronous processing preserve accepted work across retries, bursts, and worker restarts.

- The service durably commits the minimal authorized update receipt and required asynchronous work before acknowledging successful receipt to Telegram.
- Webhook persistence and acknowledgement complete below one second for at least 95% of normal and approved 100-message-per-minute burst traffic.
- Content excluded by product rules is not converted into retained Accepted Evidence merely because a minimal durable receipt was required.
- Worker crashes, leases, retries, and repeated Telegram delivery do not lose accepted messages or duplicate completed results.
- Processing preserves deterministic source order wherever order affects same-day context or shared Topic state, including across retries and concurrent workers.
- The system reports explicit failure rather than silently dropping required evidence, truncating required context, or committing partial AI success.

### NFR-4: Backup and disaster recovery

The production pilot targets a recovery point of no more than one hour of data loss and recovery of core production service within eight hours after a major infrastructure loss.

- Backups are encrypted, access-controlled, and stored outside the primary server.
- Backups containing data removed under FR-32 expire within 30 days after live deletion, and restore procedures reapply both District deletion markers and current normal-retention expirations before the restored service becomes accessible.
- Backup completion and freshness are monitored; a failed or stale required backup is a Critical System Health issue.
- A clean-environment restore test passes before production launch, at least every three months thereafter, and after major storage or backup changes.
- A beginner-friendly recovery runbook identifies prerequisites, steps, verification evidence, and safe escalation.
- The MVP makes no formal uptime-percentage promise, and single-server deployment remains a known availability limitation.

### NFR-5: Authentication and District isolation

Private product access uses the approved simple username-and-password model and enforces deterministic authorization outside AI behavior.

- There is no public registration; Zubaydulla creates and resets Hokim credentials, while the Product Owner account is created during secure deployment and is recoverable through a server-side maintenance command.
- Passwords or passphrases contain at least 15 and at most 128 Unicode code points, support spaces and Unicode without composition rules or silent truncation, reject commonly used or compromised values during credential creation/reset, and are stored only as secure password hashes.
- HTTPS and secure browser session cookies protect authenticated sessions. A session ends after 12 hours of genuine user inactivity or after 24 hours of absolute lifetime, whichever occurs first. Background requests or passive session checks do not by themselves extend the inactivity period.
- Legitimate multi-device sessions are allowed, while disabling or replacing an account immediately revokes all of its sessions.
- Repeated failed logins are rate-limited and recorded in Audit History.
- A Hokim can access only the assigned District, and cross-District denial does not depend on an AI model.
- The MVP provides no MFA, email or SMS reset, social login, enterprise SSO, or public self-registration.

### NFR-6: Lightweight data protection

The product applies a practical baseline proportionate to evidence originating in public Telegram groups without introducing enterprise privacy administration into the MVP.

- Network access uses HTTPS, and bot tokens, AI provider keys, passwords, and other credentials remain in required server-side services rather than browser code or routine logs.
- Raw Telegram message content does not enter routine application logs, metrics, traces, or displayed raw errors.
- District authorization, 90-day production retention, subscription cancellation, and permanent deletion rules are enforced consistently.
- The MVP provides no provider-approval workflow, legal-review screen, data-residency control surface, custom key-management system, consent-management workflow, or automatic personal-data redaction.
- A formal legal/privacy review is not a PRD launch blocker for the bounded MVP; the need is reconsidered before wider commercial expansion or materially different source data.

### NFR-7: Device compatibility and practical accessibility

The MVP is desktop-first from approximately 1366 by 768 pixels and remains usable on smaller supported browsers without a separate native or mobile-specific product.

- Tablet and phone layouts preserve usable controls and can use horizontal board scrolling for the five-Lane dashboard.
- The current and previous major versions of Chrome, Edge, and Safari are supported; Internet Explorer is not supported.
- Core actions work with keyboard navigation, text and controls use readable contrast, and status meaning never depends on color alone.
- Interactive controls are comfortably touchable on smaller screens.
- Uzbek Cyrillic labels and AI summaries render without clipping or corrupted characters.
- The MVP follows practical accessibility basics but requires no formal accessibility certification.

### NFR-8: Language, evidence fidelity, and time

The Hokim dashboard and Product Owner Console use Uzbek Cyrillic as the only MVP interface language.

- The MVP provides no Uzbek Latin option, language switcher, multilingual UI, or summary transliteration.
- Technical identifiers such as model names, trace IDs, and provider error codes remain in their original form.
- Telegram evidence remains exactly in its original language and script, while Topic summaries remain Uzbek Cyrillic.
- Search operates over original Uzbek, Russian, and mixed-language evidence without translating it first.
- User-facing dates, Topic-day boundaries, Grace expiry, and cancellation deletion deadlines use Asia/Tashkent time.
- Dates display as `DD.MM.YYYY`, ordinary time as 24-hour `HH:mm`, and technically useful audit or diagnostic time may include seconds as `HH:mm:ss`.
- Timestamps are stored in a safe universal internal form and Telegram source times are displayed in Asia/Tashkent; the MVP provides no timezone selector.

## 6. MVP Pilot and Success Measures

### 6.1 Bounded production pilot

Mahalla Ovozi begins with one District for at least 30 calendar days after successful activation, using that District's real approved Mahalla groups.

- Zubaydulla monitors System Health and may manually assess AI behavior by connecting a controlled mock Mahalla group through the ordinary District onboarding and Telegram integration flow.
- The Hokim checks the dashboard whenever useful; the pilot requires no fixed time or daily login.
- Pilot success never depends on whether the Hokim makes a decision or takes action because the product's responsibility ends at delivering cautious, traceable signals.
- When group activity is too low to judge the flow fairly, the pilot is extended rather than declared successful or unsuccessful prematurely.

### 6.2 MVP success measures

The MVP is successful when the bounded pilot supports all of the following conclusions:

- The pilot Hokim can find current relevant Topics and open their Accepted Evidence without needing to read every Telegram group.
- The Hokim considers Topic summaries understandable, cautious, and traceable enough to continue using the product.
- Zubaydulla can perform normal District onboarding, operational investigation, subscription and account management, and future-only configuration changes through the Product Owner Console without routine database edits.
- Every displayed production Topic is traceable to its retained Accepted Evidence and exact AI configuration version.
- Cross-District authorization and isolation tests pass, and no confirmed exposure remains unresolved.
- No required evidence is silently lost after durable acceptance or silently removed from required AI context.
- Invalid or incomplete AI output remains an explicit failure rather than appearing as a successful Topic result.
- Approved capacity, intake, AI-delay, web-performance, backup, and recovery targets pass production-shaped verification.
- Zubaydulla considers AI behavior satisfactory through manual observation of controlled test messages processed through the ordinary Telegram integration and product flow; the application requires no score or formal evaluation report.
- At pilot review, the Hokim wants Mahalla Ovozi to remain available and Zubaydulla considers continued operation commercially worthwhile.

### 6.3 Expansion gate

The product does not add a second production District until:

- no Critical System Health issue remains unresolved;
- cross-District authorization and isolation tests have passed, and no confirmed exposure remains unresolved;
- the required backup and clean-restore verification has passed;
- durable intake and processing targets have been demonstrated under representative conditions;
- Zubaydulla considers current AI behavior satisfactory based on manual end-to-end validation through a controlled Telegram group using the ordinary product flow; and
- the pilot Hokim considers the dashboard understandable and useful enough to continue.

## 7. Explicit MVP Out of Scope

The MVP deliberately excludes the following capabilities so implementation remains focused on cautious, evidence-backed signal delivery and simple Product Owner maintenance:

- Public resident accounts, a resident-facing application, or direct report submission.
- District staff, reviewer, support-agent, or additional administrator roles.
- Automated government decisions or recommendations, task assignment, case management, escalation workflow, or verified-resolution claims.
- Telegram group administration, bot commands, or outbound bot-generated Telegram acknowledgements, questions, replies, summaries, announcements, alerts, or notifications. Incoming human messages that use Telegram's Reply function remain supported input and can provide Topic-matching context under FR-8.
- AI analysis of Telegram-marked forwarded messages.
- Audio transcription, OCR, image understanding, document or file-content analysis, and captionless-media analysis.
- Telegram edit or delete synchronization and historical Telegram message backfill.
- AI sentiment, representative public-opinion claims, prediction, cross-District ranking, or District benchmarking.
- AI semantic question search, hourly history filtering, or a separate History page.
- Payment collection, cards, invoices, pricing plans, and automatic billing.
- External operational alerts, manual incident-acknowledgement workflow, and automatic repair.
- Native mobile applications and a separate mobile dashboard design.
- Uzbek Latin or other multilingual UI options.
- Formal AI scoring or release gates, Candidate-versus-Production profiles, and required evaluation reports.
- Enterprise privacy administration, consent workflows, data-residency controls, custom key management, and formal legal-review screens.
- A formal uptime guarantee or high-availability infrastructure for the bounded MVP.

## 8. Assumptions, Dependencies, and Risks

### 8.1 Operating assumptions and external dependencies

- Each participating Mahalla has one approved public Telegram group.
- A group administrator adds the District's bot and keeps it able to receive supported messages.
- Telegram Bot API availability, delivery behavior, and source-message links are external dependencies that Mahalla Ovozi cannot guarantee.
- Telegram does not provide Mahalla Ovozi with historical backfill for messages missed while the bot, group mapping, or District is inactive.
- Production operation depends on stable internet, HTTPS, database and storage services, and configured local or hosted AI access.
- AI or provider unavailability produces an explicit delay or failure; the product never invents a successful result.
- Telegram users may post inaccurate, incomplete, contradictory, or misleading statements. Mahalla Ovozi reports them cautiously and does not verify them as facts.
- Zubaydulla remains responsible for bot tokens, AI configuration, District setup, subscriptions, accounts, operational investigation, and recovery procedures.
- The Hokim remains responsible for interpreting delivered signals and deciding whether any action is appropriate.
- **Open in Telegram** is best effort because Telegram permissions, deleted source messages, or changed links may prevent navigation.
- The bounded pilot assumes Zubaydulla can perform basic technical maintenance when System Health identifies a problem.

### 8.2 Material risks and mitigations

1. **AI misses a relevant signal.** Zubaydulla tests controlled non-real messages through a real Telegram mock Mahalla group connected by the ordinary product flow, the pilot begins with one District, and analysis configuration remains versioned and future-only.
2. **AI groups evidence incorrectly or writes a misleading summary.** Accepted Evidence remains the source of truth, summaries use cautious attribution, and the Hokim can inspect the complete evidence trail.
3. **Same-day evidence becomes too large for the configured AI.** The operation fails explicitly rather than silently truncating, System Health exposes the issue, and Zubaydulla can investigate through District-scoped Topics and Evidence plus privacy-safe diagnostics.
4. **A Telegram bot loses group access or Telegram delivery fails.** Direct technical checks and actionable health states expose verified problems, durable intake protects received work, and silence alone never becomes a false disconnection claim.
5. **The AI provider becomes slow or unavailable.** Durable queued work, visible delay or failure, safe retry rules, and prohibition of invented results or silent unapproved fallback contain the impact.
6. **A Hokim sees another District's information.** Deterministic server-side District authorization, access tests, immediate session revocation, and Audit History protect the boundary; any confirmed exposure blocks pilot expansion.
7. **The primary server or database fails.** Off-server encrypted backups, the one-hour recovery-point target, the eight-hour recovery-time target, and tested restore procedures reduce loss and downtime.
8. **The product is mistaken for verified public opinion or an automated government decision system.** Neutral wording, evidence attribution, absence of sentiment and action recommendations, and explicit Hokim decision ownership preserve the product boundary.
9. **Capacity or latency targets fail under real traffic.** Production-shaped testing, a one-District pilot, visible queue delay, and the absence of premature commercial promises prevent unsupported scale claims.
10. **Zubaydulla becomes the only maintenance knowledge holder.** Beginner-friendly setup, backup, recovery, credential, and incident runbooks plus visible configuration and Audit History reduce knowledge concentration.

When Zubaydulla compares AI errors during manual review, the accepted harm priority is: wrong Topic merge first, false-positive Topic second, missed relevant signal third, and unnecessary Topic split fourth.

# Mahalla Ovozi

## Standalone Business Idea and Product Concept

### 1. Business Idea

**Mahalla Ovozi** is a private internal civic-monitoring product for district leadership in Uzbekistan.

Its purpose is to help a district hokim and authorized staff understand what residents are reporting in local Telegram communities without requiring officials to manually read every message in every monitored group.

The product passively observes one approved Telegram supergroup for each participating mahalla. It identifies messages that relate to supported public-service issues, understands relevant conversational context, groups related resident reports into shared topics, and presents those topics in a simple dashboard backed by the original Telegram messages.

The product is designed as an **awareness and evidence tool**, not as a citizen-service or case-management system.

It does not:

* verify that a reported real-world condition is objectively true;
* replace Telegram as the place where residents communicate;
* allow residents to submit formal complaints through the product;
* reply to residents;
* create administrative cases;
* assign work to officials or service providers;
* rank incidents by severity;
* track whether a problem has been resolved;
* promise response times or service levels.

Its role is narrower:

> Help authorized district leadership see what residents appear to be reporting, understand which reports seem to concern the same underlying situation, and inspect the original evidence when they need more context.

---

# 2. The Problem

Important local civic information is often buried inside high-volume Telegram group conversations.

Residents may discuss:

* lack of drinking water;
* electricity outages;
* gas supply problems;
* waste collection issues;
* follow-up developments;
* repeated reports from different people;
* partial improvements;
* contradictory observations.

District leaders and staff cannot efficiently monitor every conversation manually.

Simple keyword monitoring is also insufficient.

A message containing a word such as "gas" may not represent an actual civic issue. At the same time, a meaningful follow-up such as "ours still hasn't come back" may contain no obvious service keyword at all.

Individual messages also frequently make sense only when read together with earlier messages.

The business problem is therefore not simply:

> "Find messages containing certain words."

The real problem is:

> "Turn ongoing local conversations into a manageable view of meaningful civic situations, while preserving the original resident evidence and avoiding unsupported conclusions."

---

# 3. Proposed Solution

Mahalla Ovozi continuously observes approved Telegram groups and organizes relevant resident reports into **topics**.

A **topic** represents one underlying civic situation as indicated by the available conversational evidence.

For example, these messages may belong to one topic:

* "There has been no electricity on Mustaqillik Street since morning."
* "Same problem in our building."
* "It briefly came back but went off again."

Rather than presenting these as three unrelated incidents, Mahalla Ovozi can present them as one evolving topic when the available context supports that interpretation.

Each topic keeps the original Telegram messages that support it.

The dashboard therefore provides two complementary layers:

1. **A concise AI-assisted overview** for rapid scanning.
2. **The original resident messages** for human inspection and verification of what was actually said.

The AI-generated overview never becomes a substitute for the underlying evidence.

---

# 4. Primary Users

## District Hokim

The hokim is the primary decision-level user.

The product should allow the hokim to quickly understand:

* what service-related topics residents are currently discussing;
* which mahallas those topics concern;
* when activity last occurred;
* how much resident-message evidence exists;
* which service areas are involved;
* whether retained evidence explicitly contains a configured reference associated with the hokim;
* what residents actually wrote.

The product is optimized for rapid situational awareness rather than administrative workflow.

## Authorized District Staff

Authorized staff can use the same district-level information to:

* monitor current civic topics;
* focus on individual mahallas;
* inspect evidence;
* search historical activity within the supported time window;
* follow exact evidence back to Telegram where possible.

## Authorized Operator

A separate operational role is responsible for ensuring the system is functioning correctly.

The operator can see information such as:

* whether monitored Telegram groups are connected;
* whether incoming information is being processed normally;
* whether processing is delayed;
* whether one mahalla's processing is blocked;
* whether repeated failures are accumulating;
* whether the local AI system is available;
* whether data-retention processes are working correctly;
* whether previous information has been safely re-evaluated when necessary.

Authorized operational views may allow inspection of retained messages and topics for diagnosis.

However, operators cannot manually rewrite the product's understanding of topics.

There is no operator interface for manually:

* merging topics;
* splitting topics;
* moving a message to another topic;
* changing topic categories;
* rewriting AI-generated summaries.

---

# 5. Initial Market and Deployment Scope

The first release is intentionally narrow.

It covers:

* one district;
* approximately 3–5 monitored mahallas;
* exactly one actively monitored Telegram group for each mahalla;
* approximately up to five monitored mahallas without requiring a redesign;
* an expected pilot volume of roughly 1,000 Telegram messages per day.

The dashboard is private.

There is:

* no public registration;
* no public dashboard;
* no citizen-facing account;
* no mobile-first requirement for the initial release.

Each authenticated user can see only information belonging to the district they are authorized to access.

---

# 6. Supported Civic Areas

The initial product recognizes four public-service categories:

1. Water
2. Electricity
3. Gas
4. Waste

Other civic domains are outside the first-release scope.

A topic may belong to one or several of these categories simultaneously.

For example, one situation may genuinely concern both Water and Electricity.

In such cases:

* the product does not choose an artificial "primary" category;
* all applicable categories are treated equally;
* the same underlying topic remains one canonical topic.

This prevents the dashboard from making one real-world situation appear to be several unrelated incidents merely because it belongs to multiple service categories.

---

# 7. The Five-Lane Dashboard

The main dashboard contains five scannable lanes:

1. Hokim-related
2. Water
3. Electricity
4. Gas
5. Waste

Each lane:

* can be browsed independently;
* displays its own topic count;
* presents the most relevant topic cards for the current filters.

The default dashboard view shows:

* Today;
* all monitored mahallas;
* newest activity first.

A topic belonging to several service categories appears once in each applicable service lane.

However, every appearance represents the **same underlying canonical topic**.

Opening the Water version or Electricity version therefore opens exactly the same topic and exactly the same evidence.

The appearance of the card may reflect the lane in which it is displayed, but this does not create separate incidents.

The Hokim-related lane is also a view of existing topics, not a separate category of incidents.

---

# 8. Topic Cards

A topic card should allow a busy district official to understand the essential situation quickly.

Each card communicates:

* a concise Uzbek Cyrillic summary;
* that the summary is AI-assisted;
* the mahalla concerned;
* all applicable service categories;
* the time of the most recent relevant activity;
* the amount of retained evidence;
* whether the topic qualifies for the Hokim-related lane;
* a useful excerpt from the latest meaningful message that can be understood on its own;
* a direct action to the exact Telegram message position when such a link can reliably be constructed.

Messages that are:

* still waiting to be processed;
* temporarily being retried;
* moved aside after repeated processing failures;
* determined to be irrelevant

must never appear as topic cards.

When processing is delayed, ordinary dashboard users should see a simple, non-technical indication that recent information may be delayed.

They should not have to understand internal processing terminology.

---

# 9. Daily Topic-Scanning Experience

A typical hokim journey is:

1. The hokim signs in.
2. The dashboard opens to today's activity across all monitored mahallas.
3. Topics are ordered by their latest activity.
4. The hokim scans the five lanes.
5. A multi-category situation may be visible in several applicable service lanes, but it remains one topic.
6. The hokim reads an AI-assisted summary and the latest meaningful evidence excerpt.
7. The hokim selects a topic when more context is needed.
8. The underlying resident evidence opens without disrupting the overall dashboard layout.

The dashboard is designed to reduce information overload while keeping the source evidence immediately accessible.

---

# 10. Evidence Inspection

Selecting a topic opens an evidence view.

This view contains only original retained messages that belong to that topic.

The messages appear chronologically from oldest to newest.

The latest retained message that can meaningfully explain the topic on its own acts as the current **anchor evidence** and is visually emphasized.

For each evidence item, the user can see, where available:

* the original resident text;
* the sender identity snapshot available at the time;
* the original Telegram timestamp;
* whether the content came from a normal text message or a textual media caption;
* any relevant reply relationship;
* an exact link back to the corresponding Telegram message.

When an exact Telegram destination cannot be constructed reliably, the product must not provide a misleading approximate link.

If earlier evidence is necessary to understand a topic but falls outside the currently selected dashboard time range, it remains available in a clearly separated **Earlier Context** area.

The evidence view does not contain actions for:

* assigning responsibility;
* setting severity;
* marking something resolved;
* closing a case;
* managing a service ticket.

The product also never labels the reported real-world situation itself as confirmed or resolved.

---

# 11. Filtering and Search

Users can focus the dashboard by time and mahalla.

Supported time choices include:

* Today;
* Yesterday;
* last 1 hour;
* last 3 hours;
* last 6 hours;
* a custom period of up to 7 days.

A topic can appear in a selected time range when it has relevant activity during that period, even when the topic originally began earlier.

Users can also filter:

* across all monitored mahallas;
* to one specific monitored mahalla.

Search covers relevant information including:

* AI-assisted topic summaries;
* retained original evidence;
* sender references;
* mahalla names.

Search results remain topic-based rather than becoming an unstructured list of individual messages.

When a user opens a search result, matching evidence should be visually highlighted.

Routine background updates should, where practical, preserve the user's working context, including:

* active filters;
* current lane positions;
* the selected topic;
* the user's position inside the evidence view.

---

# 12. Telegram Monitoring Model

Mahalla Ovozi monitors only explicitly configured Telegram groups through an official Telegram bot.

The first release supports:

* ordinary text messages;
* textual captions attached to supported Telegram content.

Before AI interpretation begins, the product retains enough source information to preserve the message's identity and context, including, where available:

* the Telegram update;
* group;
* message;
* reply target;
* sender information;
* time;
* whether the content was text or caption;
* district;
* mahalla.

The product removes obvious non-useful input such as:

* messages sent by bots;
* empty content;
* unsupported content without usable text;
* pure reaction-type noise;
* bot commands.

A message must **not** be rejected merely because it is short.

Keywords do not decide whether a message is allowed into the analysis process.

The system must also detect when the monitoring bot loses access to a group or is removed, so an operator can see that monitoring is incomplete.

The first release allows exactly one active monitored Telegram group per mahalla.

---

# 13. Contextual Understanding

The central product capability is **contextual topic triage**.

Each new message is evaluated to determine whether it:

1. starts a new supported civic topic;
2. belongs to an existing topic;
3. is irrelevant to the supported product scope.

The product analyzes messages in chronological order within each mahalla.

The normal conversational context considered for a message is limited to the preceding 24 hours.

This prevents unlimited historical conversation from influencing every decision.

There is one controlled exception:

A direct reply to an older retained message may use that exact reply relationship when it remains compatible and relevant, even when the replied-to message is older than the normal 24-hour context window.

When evaluating a message, the AI receives only:

* a limited amount of relevant recent conversation;
* a limited set of plausible existing topics from the same permitted scope.

It does not receive unrestricted historical data.

It must never attach a message to a topic simply because the two messages belong to the same broad service category.

For example:

> Two unrelated electricity outages in the same mahalla must remain separate when the available evidence does not indicate they are the same situation.

Shared category alone is never enough to merge messages.

A context-dependent fragment such as:

> "Still not working here."

cannot create a new topic by itself unless qualifying earlier context makes its meaning sufficiently clear.

At the same time, meaningful keywordless follow-ups should still be recognized when conversational evidence supports continuity.

---

# 14. Revisiting Earlier Messages

Sometimes an earlier message may initially appear irrelevant or too ambiguous to classify.

A later explicit message or direct reply may reveal that the earlier message was actually part of a supported civic situation.

During the period in which the earlier message's full text is still retained, the product may reconsider that earlier message and include it as evidence when the later context justifies doing so.

This reassessment must happen consistently so the product does not produce partially updated or contradictory topic information.

---

# 15. Topic Integrity

Every captured message can belong to:

* no topic; or
* exactly one canonical topic.

A message cannot simultaneously become evidence for multiple separate topics.

The product must prevent duplicate processing of the same Telegram source message from creating duplicate topics or duplicate evidence.

When the product creates or updates a topic, all related changes—such as:

* message membership;
* topic categories;
* summary;
* activity time;
* anchor evidence;
* Hokim-related status

must remain internally consistent.

A processing interruption must not leave the user with a half-updated topic.

---

# 16. AI-Generated Summaries

Topic summaries are written in clear Uzbek Cyrillic.

The original Telegram messages remain unchanged.

The summary must accurately communicate the nature of the evidence.

It should say, in effect:

* "Residents report..."
* "Messages indicate..."
* "Several residents wrote..."

rather than presenting ordinary resident statements as independently verified facts.

For example, the product should not transform:

> "A resident says there has been no water since morning."

into:

> "There has been no water since morning."

unless independent verification actually exists, which the current product does not provide.

The product must preserve:

* uncertainty;
* disagreement;
* contradictory reports;
* evolving information.

A later message reporting improvement or restoration may update the neutral summary of the situation.

However, the product still does not create formal statuses such as:

* Resolved;
* Closed;
* Completed.

---

# 17. Resident Attribution

The product must avoid exaggerating how many different residents have reported something.

Statements such as:

> "Several residents reported..."

are permitted only when the underlying evidence contains reliably distinct sender identities.

Repeated messages from the same identifiable person must not artificially increase the perceived number of residents.

When sender identity is insufficiently reliable, the summary must use appropriately cautious language.

---

# 18. Anchor Evidence

Every topic identifies the latest retained evidence message that is sufficiently self-contained to explain the situation without requiring an unrelated fragment for interpretation.

This becomes the topic's current anchor.

The anchor:

* supplies the primary evidence excerpt shown on the card;
* is highlighted when the evidence view opens;
* can provide the direct Telegram navigation target when an exact link is available.

As new evidence arrives or older evidence expires, the appropriate anchor may change.

---

# 19. Hokim-Related Topics

The Hokim-related lane follows a deliberately narrow rule.

A topic can qualify for the Hokim-related lane only when:

1. it already qualifies as a supported Water, Electricity, Gas, or Waste topic; and
2. retained accepted evidence contains an active configured Hokim-related keyword.

AI must not decide that something is "Hokim-related" merely because it appears serious, urgent, politically important, or severe.

The product therefore separates:

* supported civic relevance, which AI can interpret contextually;
* Hokim-lane inclusion, which depends on explicit configured keyword evidence.

Authorized operators can manage the centralized list of Hokim-related keywords.

These keywords affect only the Hokim lane.

They do not control whether a message is initially collected or whether a civic topic can exist.

---

# 20. AI Model Strategy

The initial evaluation and pilot use a locally operated AI model through Ollama, beginning with `gemma4:12b`.

The local-first approach is an explicit privacy and control decision.

When the local AI model is unavailable:

* incoming work waits safely;
* the dashboard can indicate that information is delayed;
* resident content is not automatically sent to an external AI provider.

Any transmission of resident text to an external AI service requires explicit owner approval.

There is no automatic external-AI fallback in the first release.

The specific amount of conversational context and evidence supplied to the AI should be based on measured pilot performance and available local resources rather than arbitrary assumptions.

---

# 21. AI Quality Evaluation

The product must be evaluated using realistic conversational replay before live activation.

At minimum, evaluation should measure:

### Supported-report detection

How accurately the product identifies messages that genuinely concern supported service issues.

This includes both:

* precision: how many accepted messages actually belong;
* recall: how many relevant messages the product successfully finds.

### Keywordless new-topic detection

How effectively the system identifies clear new civic situations even when no configured keyword appears.

### Keywordless follow-up understanding

How effectively contextual follow-ups are attached to the correct existing topic.

### Over-merging

How often unrelated situations are incorrectly combined.

### Over-splitting

How often one real situation is incorrectly divided into multiple topics.

### Multi-category accuracy

How accurately a single topic is associated with all appropriate service categories.

### Unsupported-category rejection

How effectively the product keeps unrelated civic domains outside the four supported areas from entering the dashboard.

### Speculative-fact violations

How often AI-generated summaries incorrectly turn resident claims into apparently verified facts.

### Resident-count attribution

How accurately summaries distinguish multiple residents from repeated messages by the same person.

### Operational performance

Evaluation must also measure:

* processing speed;
* failures;
* availability;
* local computing-resource usage.

The final acceptance thresholds are not invented before evidence exists.

The first local-model baseline is measured first.

The product owner then reviews the evidence and explicitly approves the quality gates required for live activation.

---

# 22. Data Retention

Different kinds of information have different retention periods.

### Evidence attached to topics

Original messages retained as topic evidence are kept for **90 days from their Telegram timestamp**.

### Initially irrelevant message text

Full text of messages judged irrelevant is retained for **24 hours**.

This short period allows later conversational context to reveal that an earlier ambiguous message actually belongs to a meaningful topic.

### Irrelevant-message metadata

After full text expires, non-content metadata may be retained for **14 days**.

### Repeatedly failed items

Information isolated after repeated processing failures is retained for **7 days**.

### Content-free processing history

Operational event information that contains no resident message content is retained for **14 days**.

### Health measurements

Aggregated processing-health measurements may be retained for **60 days**.

---

# 23. What Happens When Evidence Expires

Retention is not merely deletion of old messages.

When old evidence is removed, the remaining topic must be recalculated so that the dashboard no longer relies on evidence that no longer exists.

The product must reconsider, based only on retained evidence:

* the summary;
* categories;
* resident attribution;
* current anchor;
* Hokim-related status.

If the final remaining evidence for a topic is removed, the topic itself disappears.

Backups must not secretly preserve resident content beyond the approved retention period.

Daily pilot backups are therefore subject to the same approved retention policy as the primary product data.

---

# 24. Privacy and Governance

Mahalla Ovozi is intended as a private system commissioned by an authorized district hokimiyat.

The owner or client retains responsibility for policy decisions including:

* whether resident sender identities should be visible;
* how residents are informed about monitoring;
* where data is legally permitted to reside;
* legally appropriate retention periods.

These owner responsibilities do not remove the product team's responsibility to build and operate the system securely.

Core safeguards include:

* sensitive credentials are kept outside application content and source material;
* only authentic Telegram-originated monitoring traffic is accepted;
* pilot access uses secure encrypted connections;
* user sessions are protected;
* users can access only their authorized district;
* data collection and AI context are minimized;
* retention limits are actively enforced;
* deletions also apply appropriately to backups;
* resident text never appears in ordinary operational logs;
* AI prompts and raw AI-provider responses do not appear in ordinary logs;
* resident content is not sent to an external AI provider without explicit approval.

No conversational context may cross mahalla or district boundaries.

---

# 25. Reliability Principles

The product must remain trustworthy even when individual parts temporarily fail.

Key principles are:

### No lost intake during AI delay

Incoming structurally valid messages are safely captured before AI interpretation.

Temporary AI slowness or unavailability should not cause those messages to disappear.

### Chronological consistency within a mahalla

Messages from the same mahalla are interpreted in chronological order.

### Failure isolation

When an earlier message from one mahalla cannot be safely processed, later messages from that same mahalla wait until the problem is retried or isolated.

A failure in one mahalla should not unnecessarily stop processing for other mahallas.

### Duplicate protection

Repeated delivery or retry of the same Telegram message must not create duplicate evidence or duplicate topics.

### Visible delays

When processing falls behind, the system exposes that state rather than silently showing apparently complete but actually stale information.

---

# 26. Operational Visibility

Authorized operators need sufficient visibility to trust and diagnose the product.

Operational monitoring should expose:

* overall system readiness;
* Telegram bot connectivity;
* whether monitored groups remain accessible;
* amount of waiting work per mahalla;
* age of the oldest waiting item;
* blocked mahallas;
* retry activity;
* repeatedly failed items;
* local AI availability;
* AI processing latency;
* contextual triage outcomes;
* reassessment of earlier messages;
* controlled replay activity;
* retention health;
* whether dashboard information may currently be delayed.

Routine operational logs and processing events must remain free of:

* resident message text;
* AI prompts;
* AI-provider response bodies.

Protected diagnostic areas may show retained content when an authorized operator genuinely needs it.

---

# 27. Controlled Re-Evaluation

The product includes a developer-controlled way to re-evaluate selected historical information when the AI behavior or topic logic needs validation or correction.

This process must be deliberately constrained.

It should support:

* previewing expected changes without applying them;
* a separate explicit action to apply changes;
* limiting activity by district;
* limiting activity by time;
* limiting activity to selected messages or topics;
* safe repeated execution without creating duplicates;
* a record of what was performed;
* before-and-after comparison.

This capability is intended for controlled validation and maintenance.

It is not a general-purpose manual topic-editing interface for operators.

---

# 28. User Experience Standards

For normal pilot conditions:

* the initial dashboard should become usable within approximately 3 seconds on a standard office connection;
* filtering and search over already loaded information should feel effectively immediate, targeting roughly 300 milliseconds;
* opening the evidence view should feel prompt, with evidence normally visible within roughly 500 milliseconds;
* dashboard topics should refresh approximately every 10 seconds;
* operational health information should refresh approximately every 60 seconds.

These updates should not require full-page reloads or unnecessarily reset the user's current position.

---

# 29. Accessibility

The desktop dashboard targets WCAG 2.1 AA accessibility expectations for its core experience.

This includes:

* sufficient visual contrast;
* keyboard usability;
* visible keyboard focus;
* meaningful page structure;
* appropriate accessibility behavior for interactive controls.

Topic cards should be operable with common keyboard interactions such as Enter and Space.

A Telegram link nested inside a topic card must have its own keyboard focus and must not accidentally activate the entire card.

Service categories cannot be communicated by color alone.

Text labels or category chips must also identify them.

The evidence drawer should preserve expected keyboard-focus management and Escape-key behavior.

---

# 30. Explicit Non-Goals

The first release deliberately does **not** include:

* formal citizen complaint submission;
* a citizen chatbot;
* Telegram bot replies or resident-facing commands;
* ticket or case creation;
* work assignment;
* severity management;
* case status;
* resolution tracking;
* service-level management;
* manual topic merging;
* manual topic splitting;
* manual evidence reassignment;
* manual category editing;
* manual AI-summary editing;
* civic domains beyond Water, Electricity, Gas, and Waste;
* multiple actively monitored Telegram groups for one mahalla;
* combining topics across different mahallas;
* combining topics across districts;
* simultaneous operation of old and new processing systems for live comparison;
* writing live data to both old and new systems;
* a legacy-dashboard rollback switch;
* automatic use of external AI when local AI is unavailable;
* mobile-first design;
* public registration;
* public dashboard access.

These boundaries are intentional.

They keep the first release focused on validating one central proposition:

> Can contextual AI transform approved mahalla Telegram conversations into a trustworthy, evidence-backed view of local civic topics that district leadership can actually use?

---

# 31. Pilot Success Definition

The pilot succeeds when three forms of evidence align.

## User Value

District leadership can:

* understand current civic discussions faster than by reading raw group chats;
* move from a concise topic summary to original evidence immediately;
* recognize multi-category situations without mistaking them for separate incidents;
* understand when recent dashboard information may be delayed.

## Information Quality

The product demonstrates that it can:

* recognize clear supported reports without relying on keywords;
* understand meaningful keywordless conversational follow-ups;
* keep unrelated situations separate;
* combine messages only when context supports continuity;
* reject unsupported or ambiguous content even when it happens to contain a keyword;
* preserve uncertainty;
* avoid presenting resident statements as verified facts;
* avoid exaggerating the number of distinct residents.

## Operational Evidence

The owner receives measurable evidence about:

* AI quality;
* topic grouping quality;
* processing speed;
* failure behavior;
* privacy behavior;
* local computing requirements;
* operational reliability.

The purpose of the pilot is not to assume success in advance.

The pilot should provide enough evidence for the owner to make one of three informed decisions:

1. Continue.
2. Refine.
3. Stop.

---

# 32. Validation and Launch Approach

Mahalla Ovozi follows a validation-first rollout.

The intended sequence is:

1. Establish a realistic baseline for the selected local AI model.
2. Validate how information is represented and preserved.
3. Validate reliable collection and chronological handling of Telegram messages.
4. Validate contextual topic understanding with bounded conversational evidence.
5. Validate consistent topic creation, updating, and controlled re-evaluation.
6. Validate dashboard information access, retention, and operational visibility.
7. Validate the operator's diagnostic experience.
8. Validate topic-card presentation.
9. Validate original-evidence inspection, filtering, and search.
10. Complete end-to-end pilot validation before live activation.

Before activation:

* deterministic behavior must be checked;
* privacy protections must be checked;
* reliability and failure handling must be tested;
* accessibility expectations must be checked;
* realistic conversational replay must be completed;
* AI quality must be measured;
* processing speed and failure behavior must be measured;
* local computing-resource use must be measured;
* the owner must explicitly approve the resulting launch thresholds.

Any deletion of test information from the live environment requires inspection of the actual data and explicit confirmation of exactly what will be deleted at the time of the action.

Once the agreed validation gates pass, the new topic-based experience is activated directly.

The first release deliberately avoids running a permanent old-versus-new live shadow system.

Obsolete legacy processing paths should be removed only after activation checks confirm that the new product is operating correctly.

---

# 33. Core Business Proposition

Mahalla Ovozi is based on a simple but demanding proposition:

> District leaders do not need another complaint-management system. They need a trustworthy way to see the important civic situations already emerging inside the communication channels residents use today.

The product creates value by turning fragmented Telegram conversations into understandable civic topics while retaining a direct chain back to the original resident evidence.

Its differentiation comes from the combination of:

* passive monitoring rather than another submission channel;
* contextual interpretation rather than simple keyword alerts;
* topic-level organization rather than raw-message streams;
* equal handling of multi-service situations;
* evidence-first transparency;
* cautious AI summaries that preserve uncertainty;
* locally operated AI by default;
* strict privacy and retention boundaries;
* clear separation between situational awareness and administrative case management;
* measurable validation before production activation.

The intended outcome is not automated government decision-making.

The intended outcome is **better human awareness, with the original evidence always available for human judgment**.

# Domain Model & Seam Glossary: Mahalla Ovozi (Layer 1)

This document is the authoritative domain glossary for Layer 1 (**AI Intake, Topic Resolution, and Asynchronous Job Pipeline**). It defines the ubiquitous language, entity lifecycles, and architectural seams based on active code reality.

---

## 1. Core Organizational Seams

### District (`tuman`)
The primary administrative tenant in the system, corresponding to a municipal district in Uzbekistan.
- **Lifecycle States:** `ACTIVE`, `GRACE`, `SUSPENDED`, `CANCELLED`.
- **Invariant:** All data (intakes, topics, evidence, operations) is strictly scoped by `district_id`.
- **Gate Invariant:** If a district is not in `ACTIVE` or `GRACE` status, or `accessEligible` is false, incoming intakes and queued jobs are immediately dropped.

### Mahalla (`mahalla`)
The neighborhood civic unit within a District.
- **Invariant:** Communal topics and evidence clustering are scoped to a single Mahalla and a single Uzbekistan calendar day (`YYYY-MM-DD`). Cross-mahalla or cross-day topic merging is strictly prohibited.

---

## 2. Ingestion & Qualification Seams

### Telegram Intake Record
The raw citizen transmission captured via Telegram webhook or bot update.
- **State:** Persisted immutably in `telegram_intake_records` with raw wire payload (`jsonb`), message ID, chat ID, and original UTC timestamp.
- **Sender Profile:** Sanitized user identity extracted safely from wire payload (`telegramUserId`, `username`, `firstName`, `lastName`).

### Burst Window (`burst-debounce`)
A temporal aggregation mechanism grouping rapid consecutive messages from the same sender in the same chat.
- **Debounce Invariant:** 25-second sliding inactivity window; 60-second maximum burst ceiling.
- **Burst Batch:** An ordered sequence of `BurstMessageItem` records evaluated as a single coherent contextual submission.

### Structural Qualification
The pre-AI rule-based qualification gate.
- **Supported:** Messages with meaningful verbatim text or captions.
- **Excluded:** Bot commands, forwarded messages, service messages, empty messages, captionless media, and unsupported media types.
- **Seam Rule:** Exclusions are non-destructive; metadata is merged into the record without discarding raw wire payloads.

---

## 3. Intelligence & Evaluation Seams

### Semantic Relevance
First-tier AI evaluation determining whether a candidate submission communicates a genuine civic disruption.
- **Syntactic Bipartite Proposition Contract:** A message expressing a qualified utility subject (Water, Electricity, Gas, Waste, Hokim) coupled with a failure predicate (e.g., *"suv kelmadi"*, *"svet o'chdi"*, *"gaz yo'q"*) is a complete civic proposition and must **never** be dropped as an ambiguous fragment.
- **Lanes:** One or more of the 5 canonical municipal lanes:
  1. `WATER` (Сув)
  2. `ELECTRICITY` (Электр)
  3. `GAS` (Газ)
  4. `WASTE` (Чиқинди)
  5. `HOKIM_RELATED` (Ҳокимга оид)
- **Exclusion Categories:** `PLANNED_ANNOUNCEMENT`, `ADVERTISEMENT_OR_SPAM`, `SPECULATION_OR_RUMOR`, `NEUTRAL_OR_PRAISE`, `GENERAL_CHATTER`, `UNRESOLVED_AMBIGUOUS_FRAGMENT`.

### Context Snapshot (`MahallaDailySnapshot`)
A deterministic, point-in-time assembly of all accepted evidence for a specific District, Mahalla, and calendar day.
- **Ordering Rule:** `original_timestamp ASC -> telegram_message_id ASC -> id ASC`.
- **Integrity Invariant:** Sealed with a SHA-256 fingerprint and integer `contextRevision`.
- **CAS Guard:** If the revision advances between AI prompt assembly and database commit, the assignment aborts and retries with the fresh revision.

---

## 4. Topic Resolution & Projection Seams

### Communal Topic (`mavzu`)
An active municipal issue entity representing an ongoing problem within a Mahalla during a specific calendar day.
- **Primary Lane:** Immutable single lane assigned upon topic creation.
- **Lifecycle:** Created upon first qualifying report (`NEW_TOPIC`), updated monotonically as further corroborating evidence arrives (`MATCH_EXISTING_TOPIC`).

### Direct Telegram Reply
A citizen message explicitly replying to a previous Telegram message already registered as accepted evidence.
- **Bypass Invariant:** Direct replies bypass AI evaluation entirely and attach deterministically to the parent message's topic.

### Topic Matching & Entity Resolution
The algorithmic and AI process linking candidate evidence to an existing topic.
- **Resolution Tiers:**
  1. Direct Telegram reply lookup (database query).
  2. 1-based prompt index match (`matched_topic_index`).
  3. Exact topic ID match (`top_...`).
  4. Fuzzy string match (Levenshtein distance $\le 3$).
  5. Lane consolidation match (single active topic in candidate lane).
  6. Fallback downgrade to `NEW_TOPIC` (prevents job worker failure).

### Accepted Evidence
Citizen messages that have passed qualification, relevance, and topic matching. Persisted in `accepted_evidence` and linked to a parent Topic.

### Topic Assignment Coordinator (`TopicAssignmentCoordinator`)
The deep domain coordinator owning the end-to-end assignment lifecycle for qualified citizen submissions:
- **Contract:** `assignEvidenceToTopic(command: TopicAssignmentCommand): Promise<TopicAssignmentOutcome>`
- **Internalized Invariants:**
  - Enforces pre-AI district lifecycle eligibility (`ACTIVE`/`GRACE`/`accessEligible`).
  - Idempotency guard against duplicate evidence processing.
  - Direct Telegram reply fast-path resolution (bypassing AI Gateway).
  - Snapshot retrieval and cryptographic verification.
  - Non-transactional AI evaluation invocation (`TopicMatchingEvaluator`).
  - Optimistic concurrency assertion raising `StaleSnapshotRevisionError` upon collision.
  - Multi-tier algorithmic entity resolution (`resolveTargetTopic`).
  - Transactional persistence of evidence, topic counters, and downstream projection events.
- **Outcomes:** `ASSIGNED_EXISTING`, `CREATED_NEW`, `SKIPPED_INACTIVE_DISTRICT`, `SKIPPED_DUPLICATE`, `UNASSIGNABLE_VAGUE`.

### Topic Projection
The synthetic public summary of an active Communal Topic.
- **Summary:** 1–2 sentence cautious Uzbek Cyrillic overview of reported disruption and status.
- **Anchor Quote:** Verbatim quote from the latest meaningful evidence report.
- **Attribution:** Volume-aware attribution (*"Маҳалла фуқароси"*, *"Маҳалла аҳолиси"*).
- **Generation:** Monotonically increasing generation number tracking projection recalculations.


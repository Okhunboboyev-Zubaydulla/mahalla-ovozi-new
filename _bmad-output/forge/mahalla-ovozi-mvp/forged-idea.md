# Mahalla Ovozi — Forged Idea

**Outcome:** HARDENED
**Canonical precedence:** This artifact supersedes conflicting rules in the former `product-idea.md`. Later approved Forge decisions supersede earlier memlog entries.

## Product

- Private, paid monitoring software commissioned directly by hokims; not public SaaS.
- MVP supports 3–4 district-scoped customer deployments, up to 30 mahalla groups each.
- The hokim directly monitors a private dashboard; no staff review or reporting layer.
- The Product Owner operates all customer deployments. Application roles are only `Product Owner` and `Hokim`.
- Four ordinary service lanes: Water, Electricity, Gas, Waste.
- One independent Hokim-related complaint lane, including complaints outside the four service lanes.
- No complaint portal, citizen app, case management, task assignment, SLA, resolution tracking, severity ranking, fact verification, or manual Topic editing.

## Signal model

- One district-owned passive Telegram bot per district; never share bot tokens across customers.
- Bot is a normal non-admin group member with Group Privacy Mode disabled, receives ordinary human messages, and never speaks or manages the group.
- Analyze human text and textual captions. Skip commands, bot messages, empty content, captionless media, audio, OCR, documents, and other unsupported content.
- Structural filtering removes only obvious non-content. Semantic LLM triage decides relevance.
- Category vocabulary may include informal Uzbek/Russian terms, Latin/Cyrillic forms, jargon, abbreviations, and common typos.
- Vocabulary is guidance only: a term never forces relevance, and a keywordless signal may qualify.
- Irrelevant messages are immediately discarded. A missed signal is not restored or automatically reconsidered.
- Planned announcements, advertisements, pure speculation, neutral hokim mentions, and praise are excluded.

## Topics

- A Topic is one underlying situation within one district, mahalla, and Uzbekistan calendar day.
- Topic matching resets at midnight. Cross-day continuation and cross-day reply exceptions are forbidden.
- Direct Telegram reply metadata takes precedence; otherwise vague follow-ups use the nearest preceding same-day Topic-linked message.
- A new Topic requires a self-contained signal; fragments cannot seed one.
- Time gaps, restoration reports, recurrence, and contradictory reports may remain in the same daily Topic when they concern the same situation.
- All raw accepted evidence from all same-day Topics in the mahalla is LLM context; raw irrelevant chat, old AI summaries, vector retrieval, and a separate recent-message window are excluded.
- One canonical Topic may appear in multiple lanes. Category membership is dynamically derived from accepted evidence.
- Hokim-related complaints may create Hokim-only Topics. If also service-related, the same Topic appears in Hokim-related and applicable service lanes.
- Mixed messages retain complete original text; unsupported portions are ignored unless they independently qualify the message as Hokim-related.
- Derived fields—summary, categories, anchor, latest activity, attribution, and Hokim-related status—recalculate from current accepted evidence when new evidence arrives.

## Evidence and history

- Raw accepted Telegram evidence is the source of truth.
- Summaries use cautious Uzbek Cyrillic attribution, preserve disagreement, and never present resident reports as verified facts.
- Card evidence count is retained-message count. Repetition by one sender must not be described as several residents.
- Anchor is the latest self-contained meaningful evidence, not the newest fragment and not a truth or resolution statement.
- Evidence shows `@username`, otherwise Telegram display name; never infer or display phone numbers.
- Forwarded messages follow normal semantic rules. Edits are ignored. Deleted Telegram messages remain captured evidence until Topic expiry.
- Daily Topic and all evidence expire together 90 days after the Topic’s latest relevant evidence timestamp.
- Required **Open in Telegram** action is best-effort; captured dashboard evidence remains usable when Telegram navigation fails.
- One unified Hokim dashboard defaults to Today and supports complete-day date filtering plus plain-text search across the full retained 90-day window; there is no separate History page.
- Search combines date or date range, mahalla, lane or category, and retained Topic summaries, evidence, usernames, and display names within the Hokim’s district.
- Large result sets load progressively inside each lane instead of loading the full 90-day result set at once.

## Dashboard UX direction

- The Hokim interface has no sidebar, global navigation row, or page-navigation tabs. One compact sticky toolbar contains brand, fixed district context, date and mahalla filters, search, freshness, Help, and profile.
- The Product Owner may use a sidebar because customer and system administration require multiple destinations.
- The five lanes remain visible together on normal desktop widths; smaller widths use horizontal board scrolling without shrinking cards below readable widths.
- The board fills the viewport below the toolbar. Each lane keeps a fixed header and independently scrolls its cards.
- Opening the evidence drawer overlays the board from the right. Drawer open or close and background refresh preserve every lane’s scroll position.
- A compact five-card statistics strip sits between toolbar and lanes: unique Topics with period comparison, Hokim-related Topics, active mahallas with evidence count as secondary context, most active service category, and most active mahalla or an adaptive replacement.
- Statistics follow active date and mahalla filters. A meaningless metric is replaced, and comparison uses the equivalent preceding retained period when available.
- “Most active” means unique Topic count, not message volume. Service comparison covers Water, Electricity, Gas, and Waste; a multi-category Topic counts once in each applicable service. Hokim-related remains separate.
- Trend direction is neutral and never implies good or bad service performance. AI mood or sentiment statistics are excluded from MVP because captured signals are not representative public opinion.

## Access and configuration

- Hokim sees only the hokim’s district. Product Owner has standing operational access across customer districts.
- The private customer arrangement must disclose Product Owner evidence access.
- Product Owner manages districts, subscriptions, bots, groups, hokim accounts, System Health, and settings.
- District Settings contains hokim recognition terms. Product Owner Settings contains global category vocabulary plus optional district-specific additions.
- Model, prompt, and vocabulary changes activate immediately for future processing only.
- Store activation time and exact configuration version for every processing result.
- Previously processed relevance, category, and Topic-assignment decisions are never rerun.
- New evidence may normally update Topic-derived fields using the active configuration.
- Product Owner may roll back to a previous configuration; rollback affects future processing only.
- Historical AI comparison uses copied evaluation data and never overwrites production history.

## Operations and commercial rules

- Capacity envelope: 4 districts, 120 groups, 20,000 messages/day, short bursts of 100 messages/minute, 10 simultaneous dashboard sessions.
- Durable ordered processing without message loss is more important than real-time display.
- Target approximately 5 minutes in normal traffic and 15 minutes for short burst backlogs; these are validation targets, not untested guarantees.
- Storage envelope: up to 10% retained evidence, approximately 180,000 messages across 90 days.
- System Health shows verified bot/group access state, inactivity warnings, queue health, AI status/version, latency, success/failure counts, and actionable errors.
- Silence is not proof of disconnection. Distinguish verified Telegram access loss from a quiet group.
- Retry only messages that never completed processing, using original Telegram timestamps. Never replay completed production messages.
- Private subscriptions are manually managed; payment happens outside Mahalla Ovozi.
- `Active`: ingestion, AI processing, and Hokim access enabled.
- `Grace`: seven overdue days with continued service and renewal warnings.
- `Suspended`: stop new ingestion/processing and Hokim access; retain data temporarily; reactivation resumes future messages only.
- `Cancelled`: stop service, remove bot token from Mahalla Ovozi, retain data for 30 recovery days, then permanently delete district data. The district keeps its bot.
- Continue while the hokim finds the product useful and the Product Owner finds operation commercially worthwhile; either may stop participation.

## Trust and accepted trade-offs

- Error priority: wrong Topic merge, false-positive Topic, missed relevant signal, unnecessary Topic split.
- Continue when the hokim uses the product and finds it useful; improve when value exists but errors or friction damage trust; stop when reasonable improvements cannot produce sufficient value or viable cost.
- Missed relevant signals may be permanently lost because irrelevant production text is not retained.
- False-negative measurement uses a separately collected evaluation dataset, not discarded production messages.
- Forwarded-message origin may occasionally be unclear.
- Captured evidence may differ from later Telegram edits.
- Telegram source links may fail.
- Same-day messages may be processed by different configuration versions; version tracking makes this traceable.

## Rejected

- Rolling 24-hour or cross-day Topics.
- Hourly filters.
- Automatic reassessment or production historical replay.
- Planned-announcement and Service-notice Topics.
- Keyword admission or rejection.
- Raw full-chat context, ambiguous-message pools, vector retrieval, or separate recent-message windows.
- Per-message evidence expiry inside a retained Topic.
- Shared cross-district bot tokens.
- Public registration, marketing funnel, public checkout, automatic charging, and complex accounting integrations.
- Additional staff, district-admin, or technical-operator application roles.
- AI semantic question search and manual Topic correction tools.

## Downstream validation gates

- Technical research and load testing must validate local AI throughput, all-same-day evidence context, and 5/15-minute targets before commercial promises.
- Architecture must define tenant isolation, durable queues, idempotency, bot-token rotation/offboarding, backup/restore, disaster recovery, authentication, audit records, and permanent deletion.
- PRD must convert these locks into testable functional and non-functional requirements.
- UX must refine the locked role-specific navigation, unified 90-day Hokim dashboard, filter-aware statistics strip, five-lane scrolling board, evidence drawer, Product Owner customer/subscription management, System Health, and settings.

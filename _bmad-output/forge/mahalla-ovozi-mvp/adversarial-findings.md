# Mahalla Ovozi Forge — Adversarial Findings

- The early one-district, founder-funded MVP entries conflict with the later approved private paid product for 3–4 district deployments. The final artifact must use the later decision and identify the earlier entries as superseded.
- “Supported MVP service categories are Water, Electricity, Gas, and Waste” is incomplete after Branch K. Those remain the four service lanes, but Hokim-related is an independent complaint-signal category that may accept complaints outside those services.
- The mixed-content rule says an unsupported road complaint creates no Topic, while Branch K allows a road complaint clearly related to the hokim to create a Hokim-related Topic. The final rule needs an explicit Hokim-related exception.
- Dashboard browsing is limited to custom ranges of at most seven days, while the approved search example spans the retained 90-day history. The final artifact must distinguish short browsing filters from 90-day historical search.
- Future-only model, prompt, and vocabulary changes conflict with recalculating an existing same-day Topic whenever new evidence arrives. Without a version boundary, a configuration change could silently rewrite a Topic already shown earlier that day.
- Immediate deletion of irrelevant messages makes production false-negative recovery impossible and prevents recall measurement from production history. The final artifact must state that missed-signal evaluation uses a separately collected evaluation dataset rather than retained irrelevant production messages.
- Subscription activation, suspension, cancellation, and expiry are named, but their effects on Hokim login, Telegram ingestion, retained evidence, and later reactivation are not defined.
- The commercial model alternates between “district customer” and “hokim personal order.” The final artifact must state that the deployment is district-scoped but privately commissioned by a hokim unless a later contract says otherwise.
- Standing Product Owner access across customer districts is approved, but the customer expectation is not stated. The final artifact should require this access model to be disclosed as part of the private service arrangement.
- “No messages received recently” does not prove that a bot was removed; the group may simply be quiet. System Health must distinguish verified Telegram access loss from suspicious inactivity.
- District-owned bot tokens are approved, but compromise, rotation, contract termination, and deletion from Mahalla Ovozi configuration are not described. These need explicit architecture and operations requirements.
- The approved 20,000-message daily load, all-accepted-same-day evidence context, local AI processing, and 5/15-minute latency targets have not been technically validated together. Technical research and load testing must remain a gate before promising this capacity commercially.
- The 90-day evidence promise has no backup, restore, or disaster-recovery boundary. Architecture must define how retained evidence survives ordinary infrastructure failure.
- Product Owner diagnostics allow retry of never-completed messages, but the final artifact must clearly separate queued/failed unprocessed content from successfully classified irrelevant content, which is immediately discarded.

## Resolution Record

- Closed: the final forged artifact uses the later private paid 3–4 district model and explicitly supersedes the earlier one-district founder-funded boundary.
- Closed: Water, Electricity, Gas, and Waste are named as service lanes; Hokim-related is named as an independent complaint category.
- Closed: mixed unsupported content may create a Hokim-related Topic only when it independently satisfies the Hokim complaint rule.
- Superseded by later user decision: one unified Hokim dashboard defaults to Today and supports complete-day filtering plus plain-text search across retained 90-day history; the separate History page and seven-day browsing limit are removed.
- Closed by user decision: configuration changes activate immediately for future processing, with activation timestamps, per-result version tracking, no reprocessing of old decisions, and future-only rollback.
- Closed: production false-negative recovery is rejected; missed-signal evaluation uses a separately collected evaluation dataset.
- Closed by user decision: Active, seven-day Grace, Suspended, and Cancelled states now define ingestion, access, reactivation, 30-day recovery, and deletion.
- Closed: deployments are district-scoped and privately commissioned by hokims; they are not public SaaS.
- Closed: standing Product Owner evidence access must be disclosed in the private customer arrangement.
- Closed: System Health distinguishes verified Telegram access loss from inactivity warnings.
- Routed to Architecture: token rotation, compromise handling, and offboarding.
- Routed to Technical Research and load testing: local AI throughput and latency feasibility.
- Routed to Architecture: backup, restore, and disaster recovery for 90-day evidence.
- Closed: retry applies only to never-completed processing; successfully classified irrelevant content is immediately discarded.

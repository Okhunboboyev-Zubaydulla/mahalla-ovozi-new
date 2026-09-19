# Spec: Userbot Transport (Opt-In)

## Problem Statement

Some Mahalla Telegram group admins refuse to add the official District bot, or residents self-censor because a known automated account is visibly present in the group. As a result, a Hokim's daily picture for those Mahallas is incomplete or missing entirely. The Product Owner needs a supported way to ingest those groups without a visible official bot, without weakening the existing single intake pipeline, and without turning a fragile, ban-prone mechanism into the platform's default.

## Solution

Introduce an explicit per-Mahalla **transport** selection. `BOT_API` remains the default and unchanged. A Mahalla explicitly marked `USERBOT` is ingested by a District-owned Telegram user account (a "userbot") that is admitted into the group as an ordinary person, runs in a dedicated long-lived service, and feeds the **same** transactional intake, dedup, qualification, and Topic pipeline as the official bot. The userbot is never the default, is enabled per-District, and is kill-switchable. The client accepts the Telegram ban and citizen-consent risks in writing.

## User Stories

1. As a Product Owner, I want the official Bot API to remain the default transport for every Mahalla, so that existing Districts are unaffected by this feature.
2. As a Product Owner, I want to mark a specific Mahalla group as `USERBOT`, so that only groups whose admins refused an official bot use the alternative transport.
3. As a Product Owner, I want to switch a Mahalla back from `USERBOT` to `BOT_API`, so that a recovered or cooperative group returns to the stable, officially supported path.
4. As a Product Owner, I want at most one transport active per Mahalla group, so that I do not pay double operational cost or widen the ban surface unnecessarily.
5. As a Product Owner, I want a per-District userbot account, so that a Telegram ban is contained to a single District.
6. As a Product Owner, I want to provision and log in a District userbot account once via an interactive CLI on the VPS, so that the session can be established without exposing credentials.
7. As a Product Owner, I want the userbot session string stored encrypted, so that a database leak does not yield account access.
8. As a Product Owner, I want to disable a District userbot without redeploying, so that I can stop ingestion immediately if abuse or ban is suspected.
9. As a Product Owner, I want to see the current status of each District userbot session (`ACTIVE`, `PENDING`, `BANNED`, `DISABLED`), so that I understand which Mahallas are actually covered.
10. As a Product Owner, I want to be alerted when a userbot session is banned or has not been seen, so that ingestion failure is not silent.
11. As a Product Owner, I want the ban alert raised as an Operational Issue scoped to the District, so that it uses the existing console alerting.
12. As a Product Owner, I want to record the client's written acceptance of the Telegram ToS/ban risk, so that the decision is auditable.
13. As a Hokim, I want Accepted Evidence from `USERBOT` groups to appear in my daily dashboard exactly like `BOT_API` evidence, so that my situational awareness is consistent regardless of transport.
14. As a Hokim, I want evidence from a `USERBOT` group attributed to the correct Mahalla, so that neighborhood-level understanding is preserved.
15. As a Hokim, I want a group that switches transport mid-day to not create duplicate Topics, so that my daily view stays clean.
16. As a Hokim, I want Topics synthesized identically from both transports, so that the AI qualification and clustering behavior is transport-independent.
17. As a system, I want a userbot message authorized by *(District session ACTIVE) + (group mapped to that District, VALID) + (District ACTIVE/GRACE)*, so that tenant isolation holds without a `botId`.
18. As a system, I want the official Bot API path to authorize exactly as it does today, so that the new resolver does not regress existing Districts.
19. As a system, I want both transports to enter one transactional intake function, so that dedup `(district, chat, message)` and downstream jobs are single-source.
20. As a system, I want MTProto updates normalized into a Bot-API-compatible message payload before persistence, so that all downstream readers see one payload shape.
21. As a system, I want the intake record's bot identity to be BOT_API-only (required iff source='BOT_API') with an explicit source discriminator, so that userbot evidence does not fabricate a bot identity.
22. As a system, I want the burst-debounce job payload to carry a source identifier rather than a required `botId`, so that debounce works for both transports.
23. As a system, I want a userbot group switch to collapse cross-transport duplicates via the existing unique key, so that no new dedup mechanism is introduced.
24. As a system, I want the userbot process isolated in its own service, so that a socket crash or ban cannot take down the HTTP API or the AI worker.
25. As a system, I want the userbot service to reconnect its sessions automatically, so that transient network loss does not require manual intervention.
26. As a system, I want a banned session to stop consuming and raise an alert, so that we do not spin on a dead account.
27. As a system, I want to reject `USERBOT` intake when the District session is not `ACTIVE`, so that stale or disabled accounts cannot feed the pipeline.
28. As a system, I want Audit Records for transport changes on a group, so that administrative actions remain auditable.
29. As a Product Owner, I want the userbot dependency isolated to its own adapter, so that replacing the MTProto library later does not touch the intake core.
30. As a Product Owner, I want one transport per group and no parallel dual intake, so that I do not double operational cost or duplicate error surface.
31. As a system, I want a userbot account admitted as a person via a cooperative member, an invite link, or the admin himself, so that onboarding matches how a human actually joins.
32. As a Product Owner, I want it made explicit that where nobody will admit any account, the `USERBOT` transport does not exist for that group, so that expectations are honest.

## Implementation Decisions

### 1. Transport selection
Transport is a per-group attribute on District Telegram groups with values `BOT_API` and `USERBOT`, defaulting to `BOT_API`. One transport is active per group; parallel dual intake on the same Mahalla is rejected.

### 2. Source entity for the userbot
A new District-scoped userbot sessions store holds one account per District (mirroring the one-bot-per-District rule): District FK, phone number, `api_id`, encrypted session string reusing the existing token cipher, status (`PENDING` | `ACTIVE` | `BANNED` | `DISABLED`), and last-seen timestamp. Unique per District.

### 3. Authorization resolver split at the intake entry
The existing bot-and-group resolver is generalized into a transport-aware resolver. The `BOT_API` branch keeps the `botId` anchor and existing status checks unchanged. The `USERBOT` branch authorizes by *(District session ACTIVE) + (group mapped to that District, VALID) + (District ACTIVE/GRACE)*, with no `botId`. Both branches converge on the existing transactional intake core; the pg-boss transactional boundary and dedup key are unchanged.

### 4. Canonical ingest envelope and normalization seam
A transport-agnostic ingest envelope is introduced, and MTProto updates are normalized into a **Bot-API-compatible message payload** before persistence. This is mandatory: qualification and burst logic read a single message shape, and a polymorphic raw payload would break every downstream reader.

### 5. Source discriminator on intake records
The intake record's bot identity is BOT_API-only (required iff source='BOT_API') and a `source` discriminator (`BOT_API` | `USERBOT`) is added. The existing unique key on `(district, chat, message)` is already transport-blind and stays as-is, so a group switching transport still dedups. All existing reads and writes of the bot identity field, plus the burst-debounce job payload type (which currently requires a `botId`), are migrated together.

### 6. MTProto adapter behind its own port
The existing Telegram Bot API client port is Bot-API-shaped and must not be overloaded. A separate userbot port owns session lifecycle and message streaming. The MTProto client library lives only inside this adapter. No MTProto dependency exists in the repo today; this is a greenfield dependency.

### 7. Dedicated userbot service
A new Compose service (mirroring the AI worker) hosts one client per District session and emits normalized envelopes into the shared intake core. It does not share the Bot API host pin; it needs its own egress path to Telegram data centers.

### 8. Session bootstrap CLI
A one-off interactive CLI runs on the VPS to perform the phone-code login and write the encrypted session string into the sessions store. No interactive login path exists inside the running service.

### 9. Ops, watchdog, kill switch
The existing watchdog is webhook-only and does not cover a persistent session. It is extended to track session liveness and detect `BANNED`, surfacing a District-scoped Operational Issue using the existing active-issue logical-key pattern. A per-District enable flag plus `DISABLED` status provide the kill switch.

### 10. Telegram account behavior (recorded constraint)
A user account is not subject to Privacy Mode and receives all new messages in any group it belongs to. Messages posted before it joined are visible only if the group exposes history to new members; otherwise ingestion begins at join time. No history backfill is promised.

### 11. Risks accepted and recorded
- Automating a user account via an unofficial API puts the account under Telegram observation and can result in permanent ban. A ban kills ingestion for that District and recovery requires a new real phone number, not a code change.
- Covert ingestion of citizen discussions by a municipal customer is a consent/legal exposure independent of Telegram.
- These must be accepted in writing, per District, before `USERBOT` is enabled. An ADR records the transport abstraction and these constraints.

## Testing Decisions

Good tests assert external behavior only: HTTP request/response, database persistence, and observable pipeline outcomes. They must not couple to internal function signatures or mock internal business logic. All database/queue tests run strictly against the isolated test database, never the development database.

Test seams (confirmed), preferring existing seams and one primary entry:

1. **Primary intake seam** — drive the shared transactional intake function with a normalized envelope for `USERBOT` and assert accepted/duplicate/dropped outcomes and persisted rows.
2. **HTTP webhook seam (regression)** — assert the `BOT_API` path through the webhook route is unchanged.
3. **Authorization resolver seam** — database-backed branch tests: `BOT_API` unchanged, `USERBOT` requires an `ACTIVE` session, cross-District chat is rejected, inactive District/session rejected.
4. **Adapter/normalization seam** — tests asserting an MTProto update normalizes into the canonical Bot-API-compatible envelope, behind a mocked Telegram boundary.
5. **Session security** — encrypt/decrypt round-trip for the session string.
6. **Ops** — banned/stale session raises a District-scoped Operational Issue.
7. **Cross-transport dedup** — same `(district, chat, message)` arriving from both transports collapses to one record.

### Prior Art
- Backend HTTP-injection intake tests for group creation, uniqueness, and webhook authentication.
- Backend message-filter and content-qualification tests for the eligibility predicate.
- Backend client tests against a local mock Telegram boundary.
- Backend burst-debounce worker tests for aggregation behavior.
- Backend token-cipher tests for encrypt/decrypt round-trips.
- Backend operational-issue tests for issue lifecycle and watchdog evaluation tests for healing logic.

## Out of Scope

- Userbot as default or as the primary transport.
- Parallel dual intake on the same group.
- Automated joining/invitation of any account (admission remains a human action: cooperative member, invite link, or admin).
- History backfill beyond what Telegram exposes to a newly joined member.
- Telegram broadcast channel monitoring without an associated discussion group.
- WebSocket/live push for session status in the UI.
- Per-District container isolation (single userbot service hosts all District sessions).

## Further Notes

- The premise that a userbot bypasses the admission gate is false: any account, human or bot, must be admitted by someone with invite rights. The real advantage is that admission resembles a person joining, not installing a bot.
- Covert presence is not invisible: the account appears in the member list and typically triggers a join event; admins can notice. Discovery of a covert municipal-linked account is a worse trust event than an honest bot.
- The official alternative that may satisfy the client without any userbot is a bot re-added as a plain non-admin member with Privacy Mode disabled — it still appears in the member list but needs no admin rights. If the client's true blocker is "no admin rights," this should be preferred before `USERBOT`.
- A userbot ban is a guaranteed-likelihood event over time, not a tail case; procurement of real phone numbers per District is a client operational dependency.
- Deployment remains single-host Compose; the userbot adds one service, consistent with existing topology.

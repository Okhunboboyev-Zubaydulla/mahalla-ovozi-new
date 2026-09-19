# 18: Ban-mitigation and session-behavior policy

**What to build:** Add the prevention measures that were missing from tickets 01–10. The current design records the ban risk and recovers from it, but does nothing to reduce its probability. Also record the Telegram ToS constraints that affect the product.

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] The `UserbotClientPort` exposes no write methods (no send/invite/react/join); passive-only is an enforced invariant, not a convention. A test asserts no write method exists.
- [ ] A single-main-session guard prevents overlapping connections for one auth key; `AUTH_KEY_DUPLICATED` is handled by halting reconnection and requiring re-login rather than reconnecting in a loop.
- [ ] `FLOOD_WAIT_X` is honored exactly (sleep X, retry once, never hammer); update state is persisted so a restart does not trigger an expensive `getDifference`; no history backfill.
- [ ] The first abnormal signal (`FLOOD_WAIT`, `PEER_FLOOD`, any account restriction) raises a District-scoped Operational Issue — before a ban, not at ban time.
- [ ] An account warm-up runbook exists (aged SIM, complete human profile, gradual joining, one group at a time) and is required before a group is switched to USERBOT.
- [ ] The per-District `api_id` decision is confirmed with the client: either one Telegram application per District, or ADR-0009 explicitly states the app-level shared blast radius.
- [ ] The ToS §1.5 AI-use prohibition (applies to BOT_API too) and §1.4 read-status/ghost-mode tension are recorded as accepted product-level risks with client acknowledgement.

**Notes:** Files: `apps/backend/src/modules/userbot/*` (port, connection manager, client adapter), `docs/adr/0009-*.md`, and a new runbook under `deploy/` or `docs/`. This ticket carries no schema change. Keep GramJS isolated inside the userbot adapter.
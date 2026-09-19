# 17: Documentation corrections

**What to build:** Fix ADR-0009 so it follows the repo's ADR convention and stops overstating its guarantees, and correct the spec text that still describes the bot identity as merely nullable.

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] ADR-0009 is restructured to match the ADR-0001..0008 skeleton (title, short intro, `## Considered Options`, `## Consequences` with at least one honest tradeoff).
- [ ] The false "AD-11" citation is corrected to the real AD-11 (Disaster Recovery & Deletion Reconciliation).
- [ ] The "complete operational and ban isolation between tenants" claim is corrected: state the shared `api_id` blast radius (if the client reuses one Telegram application across Districts, an app-level discontinuation affects all Districts).
- [ ] "Accepted Risks and Mitigations" is split so written acceptance is not presented as mitigation; the ban risk's containment/recovery items are labeled as such.
- [ ] Avoided vocabulary removed where it refers to District/Hokim (use CONTEXT.md terms).
- [ ] `docs/specs/spec-userbot-transport.md` lines 33 and 61 state the bot identity is `BOT_API`-only (required iff `source='BOT_API'`), not merely nullable.
- [ ] Ticket 01's "verified no-op" has a short written report (what was checked, how), or is reclassified as unverified.

**Notes:** Docs-only. No code changes. Keep the ADR frontmatter (`status`, `date`) intact.
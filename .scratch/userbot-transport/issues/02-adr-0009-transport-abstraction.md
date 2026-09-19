# 02: ADR-0009 — transport abstraction and accepted risks

**What to build:** A decision record that fixes the transport model before any code lands. It states that transport is a per-Mahalla group attribute; that the official Bot API remains the default and the userbot is opt-in and never default; that a userbot account is client-owned and one per District; that Telegram's ban risk and the citizen-consent exposure are explicitly accepted in writing; and that admission of the account remains a human action. Consistent with the existing in-force ADRs (single domestic host, transactional intake, explicit tenant scoping).

**Blocked by:** None (can start immediately).

**Status:** completed

- [x] ADR-0009 exists under the project's ADR directory and follows the existing ADR format.
- [x] It records transport-per-group, userbot opt-in/never-default, client-owned per-District account, and explicit ToS/ban/consent risk acceptance.
- [x] It is consistent with the in-force ADRs on deployment topology, transactional intake, and tenant scoping.
- [x] No code changes are included.
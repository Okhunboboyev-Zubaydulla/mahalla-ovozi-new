# 13: State-transition integrity for userbot sessions

**What to build:** Fix four state-machine defects: (1) a BANNED session can be resurrected to ACTIVE via disable→enable; (2) re-running the bootstrap CLI silently overwrites a DISABLED kill switch; (3) the PENDING→ACTIVE update and its audit are non-atomic; (4) `updateUserbotSessionStatus` mutates security state with no Audit Record.

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] `disableDistrictUserbotSession` refuses (or preserves the ban) when status is `BANNED`; `BANNED → disable → enable` leaves the session `BANNED`.
- [ ] The bootstrap CLI refuses to set `ACTIVE` when the session is `DISABLED`; a re-run leaves the kill-switched status unchanged.
- [ ] The `PENDING → ACTIVE` status update and its `recordAuditEvent` are wrapped in one transaction, so a failed audit cannot leave the DB `ACTIVE` while the CLI reports failure.
- [ ] `updateUserbotSessionStatus` writes a `recordAuditEvent` on every mutation (status change, `lastSeenAt`, secret nulling).
- [ ] Tests cover: BANNED→disable→enable stays BANNED; CLI re-run on DISABLED is a no-op; atomic update rollback on audit failure; audit row present on status update.
- [ ] Tests run against `mahalla_ovozi_test`; typecheck passes.

**Notes:** Files: `apps/backend/src/modules/userbot-session/userbot-session-service.ts`, `apps/backend/src/modules/userbot-session/userbot-bootstrap-service.ts`. Reuse the existing `recordAuditEvent` helper; do not add a new audit path.
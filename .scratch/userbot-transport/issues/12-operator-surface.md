# 12: Operator surface — session routes, contracts, and console controls

**What to build:** The userbot session and per-group transport must be operable from the Console by the Product Owner. Today the session service functions are unreachable (no HTTP route, no api-contract) and the web drawer/table do not reference `transport` at all. Add the missing HTTP + contract + UI layers so the kill switch and transport switching actually work end to end.

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] `packages/api-contracts` gains Zod schemas for the userbot session (create/read/disable/re-enable) and exposes `transport` on the telegram-group request/response types.
- [ ] `apps/backend/src/entrypoints/http.ts` `registerAllDomainRoutes` registers userbot-session routes: create, get status, disable, re-enable. Responses use the public formatter (no ciphertext/IV/tag/`apiHash`).
- [ ] The userbot-session route layer maps `UserbotSessionNotActiveError` to a 400 `USERBOT_SESSION_NOT_ACTIVE` response with an explicit reason.
- [ ] `apps/web/src/components/TelegramGroupDrawer.tsx` reads and writes `transport` (BOT_API / USERBOT selector), sends it on submit, and surfaces the `USERBOT_SESSION_NOT_ACTIVE` refusal message to the operator.
- [ ] `apps/web/src/components/TelegramGroupTable.tsx` shows the group's transport (badge or label).
- [ ] Web tests assert behavior (not just mock fixtures): selecting USERBOT persists it; selecting USERBOT with a non-ACTIVE session is refused with the reason; the table renders the transport.
- [ ] `pnpm -r typecheck` and `pnpm -r test` pass.

**Notes:** Review found the ticket-04 operator requirement and the ticket-06 console requirement were both unmet; only backend service logic existed. This ticket closes both. Do not expose secrets in any response.
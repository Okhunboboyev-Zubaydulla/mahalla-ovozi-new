# 16: Standards sweep

**What to build:** Clear the mechanical standards violations found across the userbot transport: untyped event listeners, a root-cause-swallowing catch, PII in logs, non-idempotent migrations, and a missing dev-Compose DNS block.

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] Listener signatures are typed with a discriminated event map; `any[]` removed from `userbot-client-port.ts` and `userbot-client-adapter.ts`.
- [ ] The import `catch` in `userbot-client-adapter.ts` binds the error and chains `cause` (or throws a typed error preserving the original).
- [ ] `console.error` in `userbot-bootstrap-service.ts` is replaced with the structured logger and no longer logs `phoneNumber` (no PII).
- [ ] Migrations `0026` and `0028` use the `DO $$ ... EXCEPTION duplicate_object` guard that sibling `0025` uses, so a re-run is idempotent.
- [ ] The dev `docker-compose.yml` `userbot` service includes the `dns:` block prod has, so it reaches Telegram over its own egress path in dev too.
- [ ] Remaining `any` in touched test doubles replaced with `unknown` + narrowing where practical.
- [ ] Typecheck passes; `pnpm --filter @mahalla-ovozi/backend test` green against `mahalla_ovozi_test`.

**Notes:** Do not touch the pre-existing user-owned files (`semantic-relevance-coordinator.ts`, `health-observation.ts`, `semantic-relevance-coordinator.test.ts`). Migration edits must keep `drizzle/meta/_journal.json` consistent.
# 15: Normalizer correctness and DB-free unit tests

**What to build:** Fix the MTProto normalizer's reply mapping and its fabricated fallbacks, and add the pure unit test suite ticket 08 promised. The normalizer must never invent state and must be testable without a database or socket.

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] Reply mapping handles a message carrying only `rawMsg.replyToMsgId` (the `?? rawMsg.replyToMsgId` fallback becomes reachable); `replyToMessageId` is populated for both `replyTo` object and top-level id shapes.
- [ ] `reply_to_message` includes a `from`, so downstream `replyToUserId` / `replyToIsForwarded` / `replyToIsBot` can resolve.
- [ ] Fabricated fallbacks removed: no `Date.now()` for a missing/invalid date, no `'photo_1'` / `'doc_1'` file_ids, no hardcoded `800×600`, no `'poll_1'`; invalid state is rejected or surfaced, not invented.
- [ ] A new DB-free unit test file (e.g. `apps/backend/tests/mtproto-normalizer.test.ts`) imports only the normalizer (no `createDbPool`, no `createBossClient`, no pg-boss) and covers: plain text in a `PeerChannel` supergroup, edited message, service message, media with caption, `PeerChat`, reply (both shapes), and the drop cases (`SERVICE_MESSAGE`, `UNSUPPORTED_UPDATE_TYPE`, `EMPTY_MESSAGE`, `MALFORMED_UPDATE`).
- [ ] The module stays pure (no I/O, no input mutation, no default parameters).
- [ ] Typecheck passes; new unit suite green with no database.

**Notes:** Round 6 flagged both the fabricated state and the broken reply path; the "no DB required" criterion was unmet. `normalizedMessage` must remain Bot-API shaped and keep passing `filterTelegramMessage`. Poll/dice/geo/contact/game/sticker mapping is out of scope — trim it rather than test it.
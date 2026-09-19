# 11: Extract the shared transactional ingest core

**What to build:** Both transports must converge on ONE transactional ingest function. `processTelegramWebhookUpdate` (BOT_API) and `processUserbotIngestEnvelope` (USERBOT) currently each contain a near-identical copy of the insert/dedup/qualify/enqueue body. Extract a single `ingestTelegramMessage(tx, auth, payload)` helper and call it from both entry points. The userbot path must also gain the edited-message handling the webhook path already has.

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] A single `ingestTelegramMessage(tx, auth, payload)` (or equivalently named) function exists and contains the shared body: UUID insert, `onConflictDoNothing` dedup target `(district_id, telegram_chat_id, telegram_message_id)`, `testMessageReceivedAt` passive update, `qualifyTelegramContent` call, and both SUPPORTED/else enqueue branches.
- [ ] `processTelegramWebhookUpdate` calls the shared function; its previous inline body (`telegram-intake-service.ts:391-522`) is removed.
- [ ] `processUserbotIngestEnvelope` calls the shared function; its duplicated body (`telegram-intake-service.ts:567-702`) is removed.
- [ ] The userbot path now handles edited messages the same way the webhook path does (`UPDATED` / `ALREADY_PROCESSED`), because it inherits the shared body.
- [ ] Identical input through either transport produces identical rows (same `status`, `source`, `telegramBotId`, evidence, job payloads).
- [ ] `apps/backend/tests/userbot-ingestion-e2e.test.ts` and `apps/backend/tests/telegram-intake.test.ts` pass against `mahalla_ovozi_test`.
- [ ] Typecheck passes (`pnpm --filter @mahalla-ovozi/backend typecheck`).

**Notes:** This is the highest-severity root defect. Fixing it also removes the `processUserbotIngestEnvelope` Long Function and most Duplicated Code flagged in review. Keep `withTransactionalIntake` as the BEGIN/COMMIT wrapper; the extraction is the body it wraps.
# 14: Type and masking cleanup

**What to build:** Remove the weak typing and symptom-masking fallbacks introduced across tickets 03/06/09/10. Make `source` a required discriminator, collapse the duplicated `TelegramIntakeSource` / `GroupTransport` unions to one definition each, delete the silent `||` fallbacks and redundant casts, and allow USERBOT group creation without a VALID bot.

**Blocked by:** 11.

**Status:** ready-for-agent

- [ ] `source` is required (not optional) in `TelegramBurstDebounceJobData` (`job-types.ts`); a payload can no longer carry neither discriminator.
- [ ] One canonical `TelegramIntakeSource` type is imported everywhere; the inline `'BOT_API' | 'USERBOT'` unions are removed from `district-telegram-groups.ts`, `telegram-content-qualification.ts`, `telegram-intake-service.ts`, `burst-debounce-job-handler.ts`, and `mtproto-normalizer.ts`.
- [ ] One canonical `GroupTransport` type is used by both the DB schema and the api-contract (no duplicate literal unions).
- [ ] Silent fallbacks removed: `telegramBotId || ''` (`topic-evidence-management-service.ts`), `source || 'BOT_API'` on a NOT NULL column (`burst-debounce-job-handler.ts`), and redundant `as` casts on NOT NULL columns.
- [ ] Nullable `telegramBotId` read sites are genuinely null-aware, not coerced.
- [ ] USERBOT group creation no longer requires a `VALID` bot row and does not call `validateGroupChatWithTelegram` when `transport === 'USERBOT'`; districts without a bot can opt in.
- [ ] Typecheck passes; `group-transport.test.ts` and intake tests green against `mahalla_ovozi_test`.

**Notes:** Round 2 + Round 6 + Round 9 all converged on this cluster. Do this after ticket 11 so the shared core is already extracted.
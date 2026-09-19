# 10: Tighten bot-id semantics to `BOT_API`-only

**What to build:** Once no reader depends on the bot identity being present, the intake record's bot identity is explicitly scoped to the `BOT_API` source. A consistency check enforces that a `BOT_API` record has a bot identity and a `USERBOT` record does not, and the type documentation is tightened. Historical `BOT_API` attribution is preserved; the column is not dropped. Behavior is otherwise unchanged.

**Blocked by:** 09.

**Status:** completed

- [x] A consistency constraint enforces bot identity present exactly for `BOT_API` records.
- [x] Historical `BOT_API` attribution remains intact; no column is dropped.
- [x] Types and documentation state that the bot identity is `BOT_API`-only.
- [x] A constraint test covers both valid and violating shapes.
- [x] Full test suite and type-check pass.
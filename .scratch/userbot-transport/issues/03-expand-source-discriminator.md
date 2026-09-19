# 03: Expand — intake records carry an explicit source discriminator (wide-refactor EXPAND)

**What to build:** Intake records gain a `source` discriminator defaulting to `BOT_API`, and the bot identity becomes nullable. The burst-debounce job payload carries `source` instead of a required bot id, and every existing reader is updated in the same pass. Today's Bot API path behaves identically, and every pre-existing row reads as `BOT_API`. This is the expand half of a wide refactor: the old shape stays readable so nothing breaks mid-migration.

**Blocked by:** 01, 02.

**Status:** completed

- [x] Intake records persist a `source` discriminator defaulting to `BOT_API`.
- [x] Bot identity is nullable on intake records without breaking existing rows.
- [x] The burst-debounce job payload carries `source` instead of a required bot id.
- [x] All existing readers of the bot identity are updated and still compile.
- [x] A regression test asserts the default `BOT_API` source for the unchanged webhook path.
- [x] Migration applies cleanly to the isolated test database, and the existing intake and burst-debounce suites pass.
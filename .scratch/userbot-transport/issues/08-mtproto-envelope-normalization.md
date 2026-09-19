# 08: MTProto to canonical envelope normalization (test-first)

**What to build:** A pure, test-first normalization unit converts an MTProto update into a transport-agnostic canonical envelope whose embedded message payload is Bot-API-compatible. This is mandatory before any live socket touches the pipeline: the existing qualification and burst logic read a single message shape, and a polymorphic payload would break every downstream reader at once.

**Blocked by:** 03.

**Status:** completed

- [x] A pure normalization function converts representative MTProto update shapes into a canonical envelope.
- [x] The embedded message payload is Bot-API-compatible and passes the existing message-qualification filter unchanged.
- [x] Non-message and unsupported update types are dropped with an explicit reason.
- [x] Unit tests cover text, non-text, and unsupported updates against the mocked Telegram boundary.
- [x] No live socket or database access is required to test the unit.
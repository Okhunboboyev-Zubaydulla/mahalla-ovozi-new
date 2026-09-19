# 06: Per-group transport selection (`BOT_API` default)

**What to build:** A Mahalla group mapping gains a `transport` attribute defaulting to `BOT_API`; the contract, service, and console drawer expose it. Selecting `USERBOT` is refused with an explicit reason when the District has no `ACTIVE` session, so a group can never be switched into a transport that is not live. The authorization resolver branches on the group's transport: the `BOT_API` path is unchanged, while `USERBOT` authorizes on an active session, a valid group mapping, and an active/grace District with no bot id. Transport changes write an Audit Record.

**Blocked by:** 03, 04.

**Status:** completed

- [x] A group mapping persists `transport` with default `BOT_API`.
- [x] `USERBOT` can be selected only when the District session is `ACTIVE`; otherwise the switch is refused with an explicit reason.
- [x] The `BOT_API` authorization path behaves exactly as before.
- [x] The `USERBOT` authorization path requires an `ACTIVE` session, a `VALID` group mapped to the District, and an `ACTIVE` or `GRACE` District, with no bot id.
- [x] A chat mapped to another District is rejected on the `USERBOT` path.
- [x] Switching transport writes an Audit Record.
- [x] Resolver branch tests cover both transports, including rejection with a PENDING or BANNED session.
# 05: Session bootstrap CLI — one-time login to `ACTIVE`

**What to build:** An interactive command-line tool run on the VPS performs the phone-code login for a District's userbot session, stores the encrypted session, and moves the session from `PENDING` to `ACTIVE`. A failed or banned login is surfaced honestly and leaves the status unchanged. No interactive login path exists inside the running service.

**Blocked by:** 04.

**Status:** completed

- [x] The CLI accepts a one-time phone code and completes login through the MTProto adapter.
- [x] On success, the encrypted session is persisted and status becomes `ACTIVE`.
- [x] On failure or ban, the command exits with a clear error and leaves status unchanged.
- [x] No interactive login path exists in any long-running service.
- [x] The login flow is exercised against a mocked Telegram boundary.
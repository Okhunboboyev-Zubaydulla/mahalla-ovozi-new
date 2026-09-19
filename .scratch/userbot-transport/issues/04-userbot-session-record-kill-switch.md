# 04: District userbot session record and kill switch

**What to build:** A Product Owner can create a userbot session for a District by supplying a phone number and API credentials, see its status, and disable or re-enable it. The session secret is stored encrypted with the existing token cipher and is never returned in clear. Disabling takes effect immediately as a kill switch. Creating, disabling, and re-enabling each write an Audit Record.

**Blocked by:** 02.

**Status:** completed

- [x] A District can have at most one userbot session; a second create is rejected.
- [x] Session status is one of `PENDING`, `ACTIVE`, `BANNED`, `DISABLED`, starting at `PENDING`.
- [x] The session secret is stored encrypted and never returned in clear by any API.
- [x] Disable and re-enable change status immediately without a redeploy.
- [x] Create, disable, and re-enable each produce an Audit Record.
- [x] The console surfaces the session and its current status.
- [x] Encrypt/decrypt round-trip and DB persistence are covered by tests against the isolated test database.
# 07: Userbot service connects and stays alive

**What to build:** A dedicated long-running service holds one MTProto client per District session, connects to Telegram, reconnects automatically on transient loss, and keeps each session's last-seen time current. Its crash or restart does not affect the HTTP API or the AI worker. No message ingestion happens yet.

**Blocked by:** 05, 06.

**Status:** completed

- [x] A dedicated service starts in the deployment topology and holds a client per `ACTIVE` District session.
- [x] The service reconnects automatically after a simulated connection drop.
- [x] Each session's last-seen time is kept current while connected.
- [x] A crash or restart of this service does not affect the API or worker services.
- [x] It does not reuse the Bot API host pin and reaches Telegram over its own egress path.
- [x] The service is observable via structured logs.
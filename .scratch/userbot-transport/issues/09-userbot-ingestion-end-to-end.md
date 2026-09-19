# 09: Userbot ingestion end-to-end for one Mahalla

**What to build:** A live `USERBOT` group's messages reach the same transactional intake, dedup, qualification, and clustering core as the official bot. A resident's message in that Mahalla reaches the Hokim as Accepted Evidence and becomes eligible for a Topic exactly like Bot API evidence. A group that switches transport mid-day does not create duplicates, because the existing unique message key collapses cross-transport repeats.

**Blocked by:** 07, 08.

**Status:** completed

- [x] A userbot message is normalized and persisted through the shared transactional intake core.
- [x] The resulting record is accepted and yields Accepted Evidence identical in shape to Bot API evidence.
- [x] Evidence is attributed to the correct Mahalla and District.
- [x] A Topic is synthesized from userbot evidence exactly as from Bot API evidence.
- [x] The same message arriving from both transports collapses to a single record via the existing unique key.
- [x] End-to-end coverage runs against the isolated test database.
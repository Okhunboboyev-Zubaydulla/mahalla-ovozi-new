# Mahalla-Ovozi: Disaster Recovery & Restore Reconciliation Runbook

**Governed by:** FR-32, NFR-4, AD-11
**Reconciled to repository state:** 2026-09-24 (`L6-P01-01`, fix-ledger Phase 16)

> ## ⚠ STATUS: THE BACKUP TRANSPORT IS NOT CONFIGURED IN THIS REPOSITORY
>
> This runbook previously instructed operators to run a `pgbackrest` service that does not
> exist, reload a Caddyfile that does not exist, and probe a port that is not published.
> It has been reconciled with what the repository actually defines.
>
> **As of this revision the repository defines no backup transport at all.**
> `deploy/compose/docker-compose.prod.yml` declares no `pgbackrest` service, no
> `archive_mode` / `wal_level` / `archive_command`, and no repository. The `postgres`
> service sets no `command:` override. The `pgbackrest` **binary** is installed in the
> runner image (`Dockerfile:32`), which is what made the gap easy to miss: the tooling
> is present, the configured stanza and repository are not.
>
> **Consequence.** There is no automated backup in this repository, so the RPO/RTO
> targets below are **UNVERIFIED and not currently achievable as configured**. Restoring
> requires an operator-supplied snapshot taken by some mechanism outside this repository.
> Choosing and provisioning that mechanism is an open decision (see §5).

---

## 1. Overview & Architectural Principles

In accordance with **AD-11** (*Disaster Recovery & Deletion Reconciliation*), restored
PostgreSQL database state is **never immediately considered authoritative product-visible
state**. The reconciliation tooling in §3 exists and is real; the backup transport that
would feed it does not.

When PostgreSQL is restored to a prior point in time:
1. **Live-Deleted Districts** deleted after the snapshot must **never be resurrected**.
2. **Expired Topics & Accepted Evidence** whose 90-day retention elapsed during downtime
   must be purged before normal access resumes.
3. **Stale In-Flight Jobs** belonging to deleted districts must be suppressed in `pg-boss`.
4. **Normal Access Remains Blocked** via the fail-closed readiness probe
   (`GET /api/v1/health/ready` returns HTTP 503 `unready`) until reconciliation succeeds.

---

## 2. Invoking Compose Correctly

**Determine the production compose invocation before running anything.** The repository
does not record it, and guessing here is dangerous (see the volume hazard below).

Two compose files exist in the repository, and they are *not* interchangeable:

| File | Purpose |
|---|---|
| `deploy/compose/docker-compose.prod.yml` | production — 5 services, publishes only 80/443 |
| `docker-compose.yml` (repo root) | **dev only** — a lone PostgreSQL on port 5433 |

`deploy/README.md:33-61` and `package.json:17-18` run a bare `docker compose` from
`/opt/mahalla-ovozi`. Whether that resolves to the production stack or to the dev
PostgreSQL depends on what is actually deployed at that path, which **this repository does
not record**. Establish it first:

```bash
cd /opt/mahalla-ovozi
docker compose ls -a                # project name(s) and their compose-file paths
docker compose config --services    # expect the 5 prod services, not just postgres
```

Then pin both the project name and the file explicitly:

```bash
export COMPOSE_PROD="docker compose -p <project-from-ls> -f <path-from-ls>"
```

Every command below assumes `$COMPOSE_PROD`. Keep `-p` and `-f` explicit: `-p` is what
keeps this runbook attached to the *running* stack's volumes and networks.

> **Why the explicitness is load-bearing.** Compose derives the project name from the
> directory of the file passed to `-f` when `-p` is absent. Passing only
> `-f deploy/compose/docker-compose.prod.yml` names the project **`compose`** — a
> *different* project from the one already running. Compose would then create a parallel
> set of containers and, critically, a **new and empty `postgres_data` volume**, while the
> real data sat in the other project's volume. During a DR that is the worst possible
> outcome. This was confirmed locally with `docker compose config`, which reported
> `name: sub` for a compose file in a directory named `sub`.
>
> Related: `deploy/compose/.env` is picked up automatically when the compose file sits
> beside it (also confirmed locally with `docker compose config`), so no `--env-file` flag
> is needed there — but only once the real production file path is known.

---

## 3. Standard Disaster Recovery Procedure

### Step 1: Ingress Isolation

Stop the edge proxy. This is the one isolation mechanism that exists in the repository;
there is no maintenance-mode Caddyfile (see §5).

```bash
$COMPOSE_PROD stop caddy
```

Expect a full public outage for the duration. Direct database and API access over the
private `mahalla-net` bridge remains available for the steps below.

### Step 2: Stop Application Containers

Stop the HTTP server and background workers to prevent concurrent writes during restore:

```bash
$COMPOSE_PROD stop backend worker userbot
```

### Step 3: Restore PostgreSQL

**No backup transport is configured in this repository.** There is no supported
`docker compose` restore command to document. Restore from the operator-supplied snapshot
using whatever mechanism produced it, then continue.

```bash
$COMPOSE_PROD stop postgres
# ... restore the cluster here using your out-of-band mechanism ...
$COMPOSE_PROD start postgres
```

> The tombstone store the reconciliation step needs lives on the host at
> `deploy/backup/tombstones.json` and is bind-mounted into `backend`/`worker` at
> `/app/deploy/backup/tombstones.json` (`TOMBSTONE_STORE_PATH`). It is **gitignored** and
> created on demand; it is not part of any snapshot. **If the host is lost, the deletion
> tombstones are lost with it** and §4 cannot suppress resurrected districts. Preserving
> that file off-host is a prerequisite, not an optional step.

### Step 4: Execute Restore Reconciliation

Run the standalone reconciliation CLI **before** starting application and worker
containers. It loads the surviving deletion tombstones, purges resurrected districts,
reapplies 90-day retention, and cancels stale queued jobs.

Run it inside the backend container so it inherits the production `DATABASE_URL` and
`TOMBSTONE_STORE_PATH`:

```bash
$COMPOSE_PROD run --rm backend pnpm --filter @mahalla-ovozi/backend reconcile-restore
```

*Expected shape on success* (field names verified against
`apps/backend/src/modules/retention/restore-reconciliation.ts:244-255`):
```json
{
  "status": "SUCCESS",
  "event": "DISASTER_RESTORE_RECONCILIATION_CLI_COMPLETED",
  "elapsedMs": 420,
  "result": {
    "success": true,
    "resurrectedDistrictsPurged": [],
    "districtsEvaluated": 12,
    "expiredTopicsPurged": 0,
    "expiredEvidencePurged": 0,
    "expiredProjectionsPurged": 0,
    "staleJobsPurged": 0,
    "tombstonesSynchronized": 3,
    "errors": [],
    "durationMs": 418
  }
}
```

A non-empty `errors` array, or `status: "FAILED"`, must be resolved before Step 5.

### Step 5: Start Backend & Verify the Readiness Barrier

```bash
$COMPOSE_PROD start backend
```

Port 3000 is **not published** to the host — only Caddy publishes `80`/`443`. Probe the
barrier through the container rather than with a host `curl http://localhost:3000/...`:

```bash
$COMPOSE_PROD exec backend curl -i http://localhost:3000/api/v1/health/ready
```

*Expected response (HTTP 200 OK):*
```json
{
  "status": "ready",
  "timestamp": "2026-08-29T14:00:00.000Z",
  "checks": {
    "database": "ok",
    "queue": "ok",
    "restoreReconciliation": "ok"
  }
}
```

A `503` with `restoreReconciliation` of `unreconciled` or `down` means Step 4 did not
complete. Do not proceed to Step 6.

### Step 6: Start Background Workers & Re-Enable Ingress

```bash
$COMPOSE_PROD start worker userbot caddy
```

---

## 4. On-Demand Reconciliation & Diagnostics

- **API Endpoint:** `POST /api/v1/system/reconcile-disaster-restore`
  (`apps/backend/src/modules/subscriptions/subscriptions-routes.ts:533`)
- **CLI Alternative:** `pnpm --filter @mahalla-ovozi/backend reconcile-restore`
- **Audit Action:** `DISTRICT_RESTORE_RECONCILED` (queryable via `/api/v1/audit/history`)

---

## 5. Open Decisions (must be resolved before this runbook is operationally complete)

| # | Decision | Why it blocks |
|---|---|---|
| 1 | **Choose a backup transport** (pgBackRest stanza + repository, or an alternative) and provision it outside this repository | Without it there is no RPO/RTO at all, and the deletion gate in item 3 can never pass |
| 2 | **Ship a maintenance Caddyfile** (`deploy/compose/Caddyfile.maintenance`, returning 503) if stopping Caddy entirely is too blunt | Step 1 currently causes a full outage |
| 3 | **Make the backup-expiry gate satisfiable.** `apps/backend/src/adapters/backup/system-backup-verifier.ts` shells out to `pgbackrest info` and, in production (`NODE_ENV=production`), an unconfigured repository yields `verificationMethod: 'PGBACKREST_CLI_EXECUTION_FAILED'` with `isExpired: false` — a fail-closed but **permanently unsatisfiable** state that raises a `Critical` `BACKUP_EXPIRY_DELAY` issue | District deletion can never reach `VERIFIED` backup expiry |
| 3b | **Stop the backup alert from auto-resolving.** That `Critical` issue is tagged `component: 'scheduled_deletion'` / `scope: 'GLOBAL'` / `districtId: null`, and `synchronizeOperationalIssues` (`apps/backend/src/modules/issues/issue-manager.ts:218-277`) matches observations on those three fields alone. A routine healthy pg-boss probe therefore marks the alert **RESOLVED** on the next health check, while `backupExpiryStatus` stays `FAILED`. Recorded as Phase 17 of `docs/architecture-review/fix-ledger.md`, which lists three candidate fixes and their blast radius. **Not fixed — needs a ruling.** | The operator's only signal for this condition silently disappears |
| 4 | **Preserve `deploy/backup/tombstones.json` off-host** | Losing it makes §3/Step 4 unable to suppress resurrected districts |

---

## 6. RPO / RTO Compliance Matrix

| Objective | Target SLA | Mechanism actually configured | Verification Method |
| :--- | :--- | :--- | :--- |
| **RPO** | ≤ 1 hour | **NONE** — no WAL archiving, no scheduled backup | **UNVERIFIED.** No recovery drill logs exist in this repository |
| **RTO** | ≤ 8 hours | Reconciliation CLI exists (§3/Step 4); restore transport does not | **UNVERIFIED.** Timing not benchmarked |

This matrix previously cited "pgBackRest WAL archiving (15-min intervals)" and "Automated
recovery drill logs" as the proven mechanism and its evidence. Neither exists in the
repository. It is recorded here as **unverified** rather than deleted, so the gap stays
visible.

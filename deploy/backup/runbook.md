# Mahalla-Ovozi: Disaster Recovery & Restore Reconciliation Runbook

**Governed by:** FR-32, NFR-4, AD-11  
**Target Recovery Objectives:**
- **Recovery Point Objective (RPO):** $\le 1\text{ hour}$ (Continuous WAL archiving via pgBackRest)
- **Recovery Time Objective (RTO):** $\le 8\text{ hours}$ (Automated delta restore + reconciliation pipeline $\le 30\text{ minutes}$)

---

## 1. Overview & Architectural Principles

In accordance with **AD-11** (*Disaster Recovery & Deletion Reconciliation*), restored PostgreSQL database state from pgBackRest backups is **never immediately considered authoritative product-visible state**.

When PostgreSQL is restored to a prior point in time:
1. **Live-Deleted Districts** that were deleted after the backup snapshot was created must **never be resurrected**.
2. **Expired Topics & Accepted Evidence** whose 90-day retention elapsed during downtime must be purged before normal access resumes.
3. **Stale In-Flight Jobs** belonging to deleted districts must be suppressed in `pg-boss` queues.
4. **Normal Access Remains Blocked** via fail-closed Fastify readiness probes (`GET /api/v1/health/ready` returns HTTP 503 `unready`) until deletion and retention reconciliation succeeds.

---

## 2. Standard Disaster Recovery Procedure

### Step 1: Ingress Isolation & Maintenance Mode
Isolate public ingress at the Caddy edge proxy to return maintenance pages and prevent incoming user requests or webhook callbacks from hitting recovering infrastructure:
```bash
# Enable Caddy maintenance banner / 503 barrier
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile.maintenance
```

### Step 2: Stop Application Containers
Stop backend HTTP servers and background intake/AI worker containers to avoid concurrent database writes during raw database restoration:
```bash
docker compose stop backend worker
```

### Step 3: Infrastructure pgBackRest Restore
Execute a delta or point-in-time restore from pgBackRest storage repository:
```bash
# Stop PostgreSQL service temporarily for restore
docker compose stop postgres

# Execute delta restore using authoritative stanza
docker compose run --rm pgbackrest pgbackrest --stanza=mahalla_ovozi --delta restore

# Start PostgreSQL service in restricted container network
docker compose start postgres
```

### Step 4: Execute Restore Reconciliation
Run the standalone restore reconciliation CLI tool before starting application and worker containers. This loads the surviving deletion tombstones from the external tombstone store (`TOMBSTONE_STORE_PATH` / `deploy/backup/tombstones.json`), purges all resurrected districts across 17 tables, reapplies 90-day retention rules, and cancels stale queued jobs:
```bash
# Run reconciliation CLI tool
pnpm reconcile-restore
```
*Expected output on success:*
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

### Step 5: Start Backend & Verify Readiness Barrier
Start the backend application container and verify that the readiness probe passes:
```bash
docker compose start backend

# Verify health readiness probe
curl -i http://localhost:3000/api/v1/health/ready
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

### Step 6: Start Background Workers & Re-Enable Ingress
Once readiness is verified, start background workers and switch Caddy back to production routing:
```bash
docker compose start worker
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

---

## 3. On-Demand Reconciliation & Diagnostics

If an administrator needs to re-run or inspect reconciliation status from the Product Owner Console:
- **API Endpoint:** `POST /api/v1/system/reconcile-disaster-restore`
- **CLI Alternative:** `pnpm --filter @mahalla-ovozi/backend reconcile-restore`
- **Audit Action:** `DISTRICT_RESTORE_RECONCILED` (queryable via `/api/v1/audit/history`)

---

## 4. RPO / RTO Compliance Matrix

| Objective | Target SLA | Proven Disaster Recovery Workflow | Verification Method |
| :--- | :--- | :--- | :--- |
| **RPO** | $\le 1\text{ hour}$ | pgBackRest WAL archiving (15-min intervals) + continuous push | Automated recovery drill logs |
| **RTO** | $\le 8\text{ hours}$ | Delta restore ($\sim 15\text{ min}$) + `pnpm reconcile-restore` ($\le 1\text{ min}$) | Timed automated test benchmarks |

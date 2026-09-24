# L6 — Cross-cutting review: deploy, CI, Dockerfile, ADR conformance

**Date:** 2026-09-24 · **Baseline:** HEAD `a0e7372` · **Layer:** L6 (Cross-cutting)
**Scope:** `deploy/`, `Dockerfile`, `.github/workflows/ci.yml`, and conformance against **ADR-0001**, **ADR-0006**, **ADR-0008**.
**Status:** ANALYSIS ONLY. Not authorised. This document files findings; it does not fix, fund, or schedule.

> **Why this layer matters.** Per `INDEX.md` § *ADR ownership*, L6 is the **exclusive** owner of ADR-0001 (hexagonal structure), ADR-0006 (tenant scoping) and ADR-0008 (compose/Caddy edge). Every other phase is forbidden from filing against them to prevent double-counting. Before this artifact, **none of the three had ever been assessed by anyone.**

---

## 0. Method and a correction to this session's own process

Two tooling traps shaped this review, and both are recorded because they caused false results before being caught:

1. **`Select-String -Path 'dir/**/*.ts'` does not recurse on this host.** Early greps for `reconcile-disaster-restore` and for `health/ready` returned **zero matches** and would have produced two false findings ("the endpoint does not exist"). Both endpoints **do** exist — `subscriptions-routes.ts:533` and `health-routes.ts:165`. All findings below were re-verified with the recursive `grep` tool before being written down.
2. **A prior-art claim can be right in its headline and wrong in its denominator.** `INDEX.md:99` records "180+ module imports from `../../adapters/`; nine of eleven adapters import domain modules back". The first half measures correctly; the second half's denominator is wrong (see `L6-P01-04`).

**Verification legend:** `observed` (read at source this session) · `inferred` (derived from a measured count) · `unverified-risk` (reasoned, not measured).

---

## 1. Deploy / infrastructure inventory (measured)

| Artifact | Size | Notes |
|---|---|---|
| `Dockerfile` | 51 lines | 4 stages: base → deps → builder → runner (+ caddy) |
| `deploy/compose/docker-compose.prod.yml` | 136 lines | postgres, backend, worker, userbot, caddy |
| `deploy/compose/docker-compose.yml` | dev | postgres 18-alpine |
| `deploy/compose/Caddyfile` | 45 lines | security headers, API proxy, SPA + asset caching |
| `deploy/compose/.env.example` | 17 lines | GROQ AI provider |
| `deploy/backup/runbook.md` | 121 lines | DR procedure, RPO/RTO matrix |
| `deploy/README.md` | 67 lines | VPS ops via `airnet-vps` SSH alias |
| `.github/workflows/ci.yml` | 79 lines | single `validate` job |

**Measured ADR-0001 coupling (reproducible):**

```
module -> adapter import LINES:            181   (across 83 module files)
adapter -> module import LINES:             10   (across 9 adapter files)
adapter directories:                         7   (ai-providers, backup, crypto, db, jobs, storage, telegram)
adapter directories importing modules back:  5   (ai-providers, backup, db, storage, telegram)
```

---

## 2. Findings

### L6-P01-01 — the DR runbook's restore step invokes a service that does not exist

- **Path:** `deploy/backup/runbook.md:44` · **Severity:** `high` · **Class:** `correctness` / `adr-conflict` · **Verification:** `observed`
- **Evidence.** Step 3 of the disaster-recovery procedure reads:
  ```
  docker compose run --rm pgbackrest pgbackrest --stanza=mahalla_ovozi --delta restore
  ```
  `deploy/compose/docker-compose.prod.yml` defines exactly five services — `postgres`, `backend`, `worker`, `userbot`, `caddy` (`:2, :20, :55, :85, :110`). **There is no `pgbackrest` service.** A grep for `pgbackrest` across `deploy/` returns matches in `runbook.md` only, never in any compose file.
- **Consequence.** The restore step of the only written DR procedure cannot execute. `runbook.md:5` and `:120` further assert RPO ≤ 1 h "via pgBackRest" / "Continuous WAL archiving" and cite "Automated recovery drill logs" as the verification method — none of which is backed by any configuration in the repository. The `Dockerfile` does install the `pgbackrest` binary (`:32`, in the runner stage), which makes the gap easy to miss: the tooling is present, the configured stanza and service are not.
- **Related.** ADR-0008's own text asserts "Disaster recovery is managed via pgBackRest continuous WAL archiving to an offsite S3-compatible store". The compose file declares no `archive_mode`, `wal_level`, `archive_command`, or S3 repository — and the `postgres` service sets no `command:`/`args:` override. So ADR-0008's central DR claim is **unimplemented in the deployable artifact**.
- **Note on scope.** This is an L6 finding precisely because ADR-0008 is L6-owned. It is not a claim that production lacks backups — the VPS was not and cannot be inspected here (`deploy/README.md:15-23` shows access is via a local SSH key, and no SSH was performed). It is a claim about what the repository does and does not define, which is what this review can establish.
- **Fix direction.** Either add a `pgbackrest` service (and the `postgres` `archive_mode`/`archive_command` settings) to the prod compose file, or rewrite the runbook to describe the restore mechanism actually in use. Do not leave the two contradicting each other.

### L6-P01-02 — the maintenance-mode procedure reloads a Caddyfile that does not exist

- **Path:** `deploy/backup/runbook.md:28` · **Severity:** `medium` · **Class:** `correctness` · **Verification:** `observed`
- **Evidence.** Step 1 (Ingress Isolation) instructs:
  ```
  docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile.maintenance
  ```
  A workspace-wide grep for `Caddyfile.maintenance` returns **exactly one** match — this line in the runbook. The repository contains one Caddyfile: `deploy/compose/Caddyfile`, copied by `Dockerfile:50`. No maintenance variant is defined or generated anywhere.
- **Consequence.** The first step of DR — isolating public ingress before touching the database — fails, and `caddy reload` with a missing config does not leave the edge in a maintenance state. Combined with `L6-P01-01`, **two of the runbook's first three steps cannot run as written.**
- **Fix direction.** Ship the maintenance Caddyfile (a two-line site returning 503), or replace Step 1 with a mechanism that exists.

### L6-P01-03 — production runs PostgreSQL 16 while dev and CI run 18

- **Path:** `deploy/compose/docker-compose.prod.yml:3` · **Severity:** `medium` · **Class:** `hidden-dependency` · **Verification:** `observed`
- **Evidence.**
  | File | Image |
  |---|---|
  | `deploy/compose/docker-compose.prod.yml:3` | `postgres:16-alpine` |
  | `deploy/compose/docker-compose.yml:3` (dev) | `postgres:18-alpine` |
  | `.github/workflows/ci.yml:19` | `postgres:18-alpine` |
  The live test instance probed this session also reports **PostgreSQL 18.6**.
- **Consequence.** Every test signal — CI, integration suites, local dev — is produced on a major version that production does not run. Migrations, generated SQL, and driver behaviour are validated against 18 and deployed onto 16. This is a `hidden-dependency` in the strict sense: the thing CI proves is not the thing production is.
- **Fix direction.** Pin one version across all three, or record deliberately why they may differ. Production is the one that should probably move.

### L6-P01-04 — prior art's ADR-0001 claim: headline right, denominator wrong, and the direction inverted

- **Path:** `docs/architecture-review/INDEX.md:99`, `:195` · **Severity:** `medium` · **Class:** `adr-conflict` · **Verification:** `observed`
- **The recorded claim.** "ADR-0001's ports are honoured only where the module also owns them — 180+ module imports from `../../adapters/`; nine of eleven adapters import domain modules back. Marked as contradicting ADR-0001." Parked as *pending L6*.
- **What measures correctly.** The "180+" figure reproduces: **181** module→adapter import lines across **83** module files.
- **What does not.** "Nine of eleven adapters" — there are **seven** adapter directories (`ai-providers`, `backup`, `crypto`, `db`, `jobs`, `storage`, `telegram`), and **five** of them import modules back (`ai-providers`, `backup`, `db`, `storage`, `telegram`). The denominator is wrong; the count describes files (9 adapter files, 10 import lines), not directories.
- **Why the direction inverts.** Characterising the **158** import lines that resolve to an adapter *directory*:

  | Adapter target | Import lines |
  |---|---|
  | `adapters/db` | 122 |
  | `adapters/jobs` | 12 |
  | `adapters/telegram` | 10 |
  | `adapters/crypto` | 9 |
  | `adapters/storage` | 4 |
  | `adapters/backup` | 1 |

  And the **10 reverse** adapter→module imports resolve to:
  - `modules/ai/types.js` (`mock-provider-adapter.ts:6`, `http-provider-adapter.ts:6`)
  - `modules/userbot/userbot-client-port.js` (`userbot-client-adapter.ts:11`)
  - `modules/userbot-session/userbot-auth-port.js` (`userbot-auth-client.ts:17`)
  - `modules/telegram-bot/ports/telegram-client-port.js` (`telegram-client.ts:16`)
  - `modules/subscriptions/ports/backup-retention-verifier.js` (`system-backup-verifier.ts:6`, `mock-backup-verifier.ts:4`)
  - `modules/subscriptions/ports/external-tombstone-store.port.js` (`external-tombstone-store.ts:10-11`, ×2)
  - `modules/ai/ai-config.js` (`adapters/db/seeds.ts:10`)

  **Nine of those ten are imports of module-owned *port interfaces*, and one is a type-only import.** That is the *correct* hexagonal direction — the adapter implements a module-owned interface — not a violation of it. Only `adapters/db/seeds.ts:10` (`activeAiConfig`, a concrete module value) is a genuine inversion.
- **The real ADR-0001 tension is elsewhere, and it is the opposite of what prior art recorded.** ADR-0001 line 18 states modules "interact with external systems (database, queues, AI, Telegram) via interfaces defined in `adapters/`". But the ports are declared **in the modules**, not in `adapters/`: `modules/subscriptions/ports/{backup-retention-verifier,district-data-cleaner,external-tombstone-store.port}.ts`, `modules/telegram-bot/ports/telegram-client-port.ts`. A glob of `adapters/**/*port*.ts` returns **nothing**. Meanwhile **122** of 158 imports reach directly into `adapters/db` — modules importing the Drizzle schema and client as concrete dependencies rather than through a repository port.
- **Why it matters.** The recorded claim was parked for L6 as a *structure* concern and reads as "the boundary is violated in both directions, pervasively". Measured, the boundary is **one-directional and mostly sound at the interface layer**, with its real weight concentrated in one place: direct `adapters/db` coupling. That is a different, narrower, and more tractable problem than the record describes — and `INDEX.md:195` should be resolved rather than left *pending L6*.
- **Fix direction.** Amending ADR-0001 to say ports are owned by modules (matching the code, which is the healthier arrangement) is a smaller, more honest change than rewiring 122 imports. File the `adapters/db` coupling as its own bounded finding if repository ports are wanted.

### L6-P01-05 — CI runs only on `main`, and this branch can merge unverified

- **Path:** `.github/workflows/ci.yml:3-7` · **Severity:** `medium` · **Class:** `hidden-dependency` · **Verification:** `observed`
- **Evidence.** The workflow triggers on `push` and `pull_request` **only** for `branches: [main]`. The active development branch, `continue-development-with-gemini-ai-agent`, has no CI. The repository has one workflow file (`ci.yml`).
- **Consequence.** The branch carrying this program's fixes — including two commits pushed this session — is not covered by the typecheck/test/E2E job at all. Verification claims rest on local runs (which this session did perform), not on CI. The single most useful safety net in the repo does not see the code being written.
- **Fix direction.** Widen the trigger to all branches, or at minimum to `continue-development-with-gemini-ai-agent`.

### L6-P01-06 — `extra_hosts` pins a Telegram IP that can rotate

- **Path:** `deploy/compose/docker-compose.prod.yml:44-45`, `:80-81` · **Severity:** `low` · **Class:** `hidden-dependency` · **Verification:** `observed`
- **Evidence.** Both `backend` and `worker` (and by inheritance the pattern) declare:
  ```yaml
  dns:
    - 8.8.8.8
    - 1.1.1.1
  extra_hosts:
    - "api.telegram.org:149.154.167.220"
  ```
  Public resolvers are configured while the one host that matters is pinned to a **single hard-coded IP**.
- **Consequence.** The DNS block and the pin work against each other: `extra_hosts` is a static override, so the resolvers cannot correct it. If Telegram rotates `149.154.167.220` — it operates a range, and this is a documented historical endpoint rather than a stable contract — bot intake and webhook delivery fail on this host regardless of DNS health. `ADR-0009` documents userbot transport risk; this specific failure mode is not among them.
- **Why only `low`.** It is deliberate-looking (a workaround for resolution problems inside the container network) and its failure is loud rather than silent.
- **Fix direction.** Remove the pin if it is no longer needed; if it is, record why and note the rotation risk.

### L6-P01-07 — the `userbot` service depends on `backend`, coupling a transport worker to the API

- **Path:** `deploy/compose/docker-compose.prod.yml:93-97` · **Severity:** `low` · **Class:** `low-locality` · **Verification:** `observed`
- **Evidence.** `userbot` declares `depends_on: postgres (healthy), backend (healthy)`. It shares the runner image and needs no HTTP from `backend` — its own entrypoint is `src/entrypoints/userbot.ts` (`:92`).
- **Consequence.** A backend healthcheck failure prevents the userbot from starting (and `restart: unless-stopped` will keep it down), so a fault isolated to the API can take down Telegram transport as well. The dependency is on `postgres`; `backend` is incidental.
- **Fix direction.** Drop the `backend` condition if nothing at runtime requires it, or document the ordering reason.

---

## 3. What L6 found *clean* (recorded so it is not re-reviewed)

- **ADR-0006 tenant scoping — no finding.** `queryHokimBoard` (`topic-query-engine.ts:476-478`) resolves the district from `actorContext.districtId` and throws `DistrictNotFoundError` when absent (`:480-482`); the `'all'`/`'ALL'` sentinels found in the codebase are **Mahalla-name and audit-record-type filters** (`topic-query-engine.ts:217,733,911`; `audit-query-service.ts:120`; `OverviewDistrictTable.tsx:34-45`), not district scope. They are matched by the same literal on both sides, so no cross-tenant path opens. **This is the one ADR with a security consequence, and it holds.**
- **Caddy security headers are present and correct.** `Caddyfile:6-12` sets HSTS (with `preload`), `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, and a restrictive `Permissions-Policy`. API proxying sets `X-Real-IP`/`X-Forwarded-For`/`X-Forwarded-Proto` (`:16-21`) so the backend can enforce origin checks.
- **Internal ports are not exposed.** Only `caddy` publishes ports (`:117-119`); `postgres`, `backend`, `worker`, `userbot` are reachable solely on the `mahalla-net` bridge, matching ADR-0008's "internal service ports remain private".
- **The readiness barrier is real.** `health-routes.ts:165` serves `/api/v1/health/ready`, computing `isReady = isDbOk && isQueueOk && restoreStatus === 'ok'` (`:187`), returning **503** and `status: 'unready'` otherwise (`:188-196`), with the schema declaring 503 (`:170`). The `restoreStatus` check ties it to the reconciliation pipeline, so the runbook's *intent* in Step 5 is implemented even though Steps 1 and 3 are not.
- **The reconciliation tooling exists.** `entrypoints/reconcile-restore.ts:27` and `subscriptions-routes.ts:533` both call `reconcileDisasterRestore` (`retention/restore-reconciliation.ts:160`), and `pnpm reconcile-restore` is wired at the workspace root. Runbook Step 4 is accurate.
- **Dockerfile hygiene is good.** Multi-stage with a BuildKit cache mount for the pnpm store (`:14`), `--frozen-lockfile` (`:15`), a non-root `USER node` (`:43`), and a slim runtime. Contracts build before web (`:24-25`), matching dependency order.

---

## 4. Summary

**7 findings: 1 high · 4 medium · 2 low · 0 blocker.** ADR-0006 passes. ADR-0008 fails on its central DR claim. ADR-0001's recorded prior-art concern does not survive measurement in the form it was recorded, but a real and different tension replaces it.

**Not authorised by this document.** No fix, no new phase, and no re-run is funded here. `INDEX.md:195` ("ADR-0001 ports honesty — *pending L6*") can now be marked **assessed**; that is an edit for a separate, approved pass.

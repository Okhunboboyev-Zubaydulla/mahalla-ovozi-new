# L2 - Backend infrastructure review: adapters, entrypoints, cli, scripts, types, utils

**Date:** 2026-09-24 - **Baseline:** HEAD 7a2248c - **Layer:** L2 (Backend infrastructure)
**Scope:** apps/backend/src/{adapters,entrypoints,cli,scripts,types,utils}.
**Status:** ANALYSIS ONLY. Not authorised. This document files findings; it does not fix or schedule.

> **Why this layer matters.** Per INDEX.md:23, L2 is `apps/backend/src/{adapters,entrypoints,cli,scripts,types,utils}` - the hexagonal boundary layer. Before this artifact it had **never been reviewed by anyone** in this program. L6 assessed ADR-0001 conformance *structurally* (import counts) but did not read the adapters themselves.

## 0. Method

**Verification legend:** observed (read at source this session) - inferred (derived from a measured count) - unverified-risk (reasoned, not measured).

**Measured, not trusted.** Inventory produced by enumerating the filesystem.

## 1. Inventory (measured)

| Area | Files | Lines |
|---|---|---|
| apps/backend/src/adapters | 39 | 4,980 |
| apps/backend/src/entrypoints | 4 | 702 |
| apps/backend/src/cli | 8 | 750 |
| apps/backend/src/scripts | 1 | 99 |
| apps/backend/src/utils | 2 | 111 |
| apps/backend/src/types | 1 | 7 |
| **L2 total** | **55** | **6,649** |

**INDEX.md:23 is wrong on both counts.** It records 39 files / ~4,900 LOC. Measured: **55 files / 6,649 lines**. The 39 reproduces the `adapters/` subtree alone; entrypoints, cli, scripts, types and utils were not counted, and the LOC is ~36% low.

## 2. Findings

### L2-P01-01 - two adapters silently fall back to the DEVELOPMENT database

> **FIXED** in fix-ledger **Phase 21**. `resolveDatabaseUrl` now throws when neither an argument nor `DATABASE_URL` is present; `createDbPool` and `createBossClient` both use it; every non-test backend script loads `.env` via `--env-file-if-exists`.

- **Path:** apps/backend/src/adapters/db/client.ts:11 - apps/backend/src/adapters/jobs/boss-client.ts:81-84 - **Severity:** `high` - **Class:** `hidden-dependency` - **Verification:** `observed`
- **Evidence.** Both connection factories default to the same hardcoded DSN when nothing is supplied:

```js
const url = connectionString || process.env.DATABASE_URL || 'postgresql://mahalla_user:mahalla_dev_password@localhost:5433/mahalla_ovozi';
```

  `mahalla_ovozi` is the **development** database. `apps/backend/vitest.config.ts:8` sets `DATABASE_URL` to `mahalla_ovozi_test` for test runs, which is what currently keeps tests off the dev DB - the isolation depends entirely on that env var being present, not on any guard in the code.
- **Consequence.** Per `AGENTS.md` (TESTING & ENVIRONMENT ISOLATION) and `.agents/rules/testing-standards.md:9-16`, test suites must never touch `mahalla_ovozi`. The two factories make the safe behaviour a property of *the environment*, not of *the code*. Any test, script or CLI that constructs a pool without an explicit DSN and without `DATABASE_URL` set writes to the live development database. Both fallbacks also embed a password in source (`mahalla_dev_password`), which is a credential-shaped string in a tracked file even though it is a dev-only value.
- **Why `high`.** The failure mode is silent, destructive and violates a documented non-negotiable invariant.
- **Fix direction.** Remove the literal DSN fallback and throw when neither the argument nor `DATABASE_URL` is present - failing closed is correct here. This also removes the embedded password.

### L2-P01-02 - `clean-test-data` deletes every district and account, with no target guard

> **FIXED** in fix-ledger **Phase 21**. The CLI now refuses any database whose name matches `prod`, refuses any target without `--confirm`, and prints the masked target and resolved database name before deleting.

- **Path:** apps/backend/src/cli/clean-test-data.ts:1-67 - **Severity:** `high` - **Class:** `correctness` - **Verification:** `observed`
- **Evidence.** The CLI is registered as `cli:clean-test-data` (`apps/backend/package.json:18`) and calls `createDbPool()` at `:5` with **no argument**, inheriting the fallback in L2-P01-01. Its body then runs, unconditionally:

```js
"DELETE FROM sessions WHERE account_id IN (SELECT id FROM accounts WHERE username != 'Zubaydulla')"
"DELETE FROM accounts WHERE username != 'Zubaydulla'"
'DELETE FROM districts'
"DELETE FROM pgboss.job WHERE state IN ('created', 'retry', 'active')"
```

  Note the pg-boss statement deletes **all** queued, retrying and active jobs in whatever database it reaches - not just test ones. Its `catch` at `:38-40` swallows failures silently.
- **Consequence.** The script's own log line at `:7` says "Cleaning Test Fixtures from **Development Database**", so the destructive target is intended. The hazard is that the target is chosen by ambient environment rather than by an explicit argument, and that a single mistyped invocation against a database that is not disposable destroys all districts - and a district cascade reaches bots, groups, intakes, topics, evidence and AI operations (`:28` comment).
- **Why `high`.** It is a destructive operation whose blast radius is the whole tenant set, guarded by nothing in the code.
- **Fix direction.** Require an explicit connection string or a `--database` argument, refuse to run when it resolves to anything other than a name ending in `_test` or `_dev`, and re-print the resolved target before deleting. The `catch {}` at `:38-40` should log.

### L2-P01-03 - the backup-expiry dev stub returns `isExpired: true`, which is the affirmative answer

- **Path:** apps/backend/src/adapters/backup/system-backup-verifier.ts:94-110 - **Severity:** `medium` - **Class:** `correctness` - **Verification:** `observed`
- **Evidence.** When the `pgbackrest` binary is missing (`ENOENT`/`not found`) **and** `NODE_ENV !== 'production'`, the verifier returns:

```js
return {
  isExpired: true,
  oldestActiveBackupTimestamp: null,
  totalBackupsCount: 0,
  verificationMethod: 'PGBACKREST_DEV_STUB',
  rawDetails: { notice: 'pgbackrest CLI not found in non-production environment; default stub returned.', error: errMessage },
};
```

  `isExpired: true` is not a neutral stub value - it is the **affirmative** answer to "may this district's protected backups be considered expired and released?". The field carries no `error`, and `district-deletion-service.ts:491` computes `const hasError = Boolean(result.error)`, so `hasError` is `false`. Branch 1 at `district-deletion-service.ts:516` then fires on `if (result.isExpired && !hasError)` and sets `backupExpiryStatus: 'VERIFIED'`.
- **Consequence.** In any non-production environment where pgBackRest is not installed - which is the normal state of a dev machine and of CI - the verifier asserts that every district's protected backups have expired and releases the retention hold. The `.agents/rules/code-standards.md:42` rule "No Symptom-Masking Guards: do not add silent fallback values that hide invalid state" is directly engaged: this is a fallback value that reports the permissive answer for a check that did not run.
- **Why not `high`.** It is gated on `NODE_ENV !== 'production'`, and production sets `NODE_ENV: production` (`deploy/compose/docker-compose.prod.yml:33,71,101`). So it does **not** affect the deployed system. It affects local and CI behaviour, where it can mask a real retention problem.
- **Fix direction.** The stub should fail closed: return `isExpired: false` with a populated `error`, or throw. `verificationMethod: 'PGBACKREST_DEV_STUB'` already distinguishes the path, so the caller can be explicit about it rather than reading a permissive boolean.

### L2-P01-04 - three functions use default parameter values, which the repo forbids

- **Path:** apps/backend/src/adapters/crypto/token-cipher.ts:76, :26 - apps/backend/src/adapters/db/client.ts:48 - **Severity:** `low` - **Class:** `standards` - **Verification:** `observed`
- **Evidence.** `.agents/rules/code-standards.md:25` states: "**Explicit Parameters:** Never use default parameter values. All parameters must be explicitly declared and passed." Three L2 sites violate it:

| Site | Signature fragment |
|---|---|
| `adapters/crypto/token-cipher.ts:76` | `keyVersion: string = 'v1'` |
| `adapters/crypto/token-cipher.ts:26` | `getEncryptionKey(overrideKey?: string)` - optional, resolved via `??` |
| `adapters/db/client.ts:48` | `timeoutMs: number = 3000` |

- **Consequence.** Two of the three are low-consequence. The `token-cipher` one matters more than it looks: `keyVersion` is written into every persisted `EncryptedTokenPayload` and defaults silently, so a caller who forgets it stamps `'v1'` with no compile error. Given that `getEncryptionKey` ignores `tokenKeyVersion` entirely when decrypting (`:106` derives from the env var only), the version field is currently decorative - which is itself worth recording, because it means key rotation has no implemented path.
- **Fix direction.** Make the parameters required and pass the values explicitly at each call site. Also record whether `tokenKeyVersion` is intended to support rotation; today it is stored but never consulted.

### L2-P01-05 - a named constant exists but production hardcodes the literal three times

- **Path:** apps/backend/src/adapters/crypto/temporary-password.ts:10 - apps/backend/src/modules/hokim-accounts/hokim-accounts-service.ts:176, :278, :425 - **Severity:** `low` - **Class:** `duplicated-code` - **Verification:** `observed`
- **Evidence.** `DEFAULT_TEMPORARY_PASSWORD_LENGTH = 18` is exported at `temporary-password.ts:10`, but a repo-wide grep finds it referenced **only in a test** (`apps/backend/tests/temporary-password.test.ts:15`). All three production call sites pass the bare literal instead:

```js
cryptoService.passwords.generateTemporary(18)
```

- **Consequence.** The constant is effectively test-only scaffolding. If the policy length changes, the three production sites and the constant move independently and nothing fails. The JSDoc at `temporary-password.ts:40` also says "default: 18" while the function has **no** default and rejects `undefined` - the doc describes behaviour the code does not have.
- **Fix direction.** Use the constant at the production call sites, and correct the JSDoc to match the signature.

**Self-correction.** I first attributed real risk to `token-cipher.ts:76`'s `keyVersion = 'v1'` default, reasoning that a forgotten argument would silently stamp `'v1'`. Checking the call sites, the single production caller passes it explicitly (`telegram-bot-service.ts:134`), so the default is **unused rather than dangerous**. The standards violation stands (L2-P01-04); the risk I first attached to it does not.

A related observation worth recording: `getEncryptionKey` (`token-cipher.ts:26-52`) derives the key from `process.env.ENCRYPTION_KEY` or an override and **never consults `tokenKeyVersion`**. The field is persisted on every payload but is decorative today - there is no implemented key-rotation path. That is an observation, not a finding; it matters only if rotation is intended.

---

## 3. What L2 found clean (recorded so it is not re-reviewed)

- **No silent catch and no debug logging in adapters.** A grep for `catch {}` and `console.log/error` across `apps/backend/src/adapters` returns 5 matches, all legitimate CLI-lifecycle output in `db/migrate.ts` (:21, :23, :28, :37) plus one pool-close error log at `db/client.ts:92`. The single exception is the empty `catch` at `clean-test-data.ts:38-40`, filed under L2-P01-02 because it hides a destructive operation's failure.
- **The crypto facade is deliberately minimal.** `adapters/crypto/index.ts:6-11` documents that `getEncryptionKey`, `FALLBACK_DEV_KEY`, `ARGON2_CONFIG`, `COMMON_PASSWORDS_BLOCKLIST` and `UNAMBIGUOUS_ALPHABET` are intentionally **not** re-exported, keeping key derivation out of domain code.

- **Temporary-password generation is correctly built.** temporary-password.ts uses crypto.randomInt (CSPRNG) not Math.random, applies Fisher-Yates with a CSPRNG, guarantees all four character classes, and re-validates the result against the password policy before returning (:65-68).
- **Migrations take an advisory lock.** db/migrate.ts:11,20,26 wraps the run in pg_advisory_lock(847291047129481) / pg_advisory_unlock inside a finally, so two containers cannot migrate concurrently.
- **Token encryption uses AES-256-GCM with a random 12-byte IV per call** (token-cipher.ts:80-87); decryption validates the auth tag before returning plaintext (:111-117).
- **getEncryptionKey fails closed in production.** token-cipher.ts:29-34 throws when no key is configured and NODE_ENV is production; the dev-key fallback applies only otherwise. Production sets NODE_ENV: production (deploy/compose/docker-compose.prod.yml:33,71,101), so the guard is live.
- **The verifier's production path fails closed.** system-backup-verifier.ts:112-116 returns isExpired: false with verificationMethod PGBACKREST_CLI_EXECUTION_FAILED when the CLI errors in production. Only the non-production stub (L2-P01-03) returns the permissive value.
- **The `del_backup_fail` legitimate-resolution path is intact.** district-deletion-service.ts:516-540 (Branch 1) sets backupExpiryStatus VERIFIED and resolves the issue explicitly. Confirmed while reviewing L2's backup adapter.

---

## 4. Prior art correction

**INDEX.md:23 understates L2.** It records 39 files / ~4,900 LOC. Measured: **55 files / 6,649 lines** - the 39 counts the adapters subtree only, omitting entrypoints, cli, scripts, types and utils, and the LOC is ~36% low. This mirrors the L5 correction in the same session.

**L6's structural read is confirmed and refined.** `phase-L6-cross-cutting.md` §1 counted 181 module-to-adapter import lines and found 5 of 7 adapter directories importing modules back. Reading the adapters themselves: **9 of the 10 reverse imports resolve to module-owned port interfaces** (the correct hexagonal direction) and one is type-only, exactly as L6 concluded. The single genuine inversion is `adapters/db/seeds.ts:10`, which imports `activeAiConfig` - a concrete module value - and that is the only real ADR-0001 breach in this layer.

---

## 5. Honest limitations

- **Targeted sweep, not a line-by-line read.** ~6,600 lines were covered by measured pattern searches (DSN fallbacks, silent catches, debug logging, default parameters, NODE_ENV gates) plus close reads of the connection, crypto, backup and migration adapters. **The 863-line `mtproto-normalizer.ts` was NOT read** - it is the single largest L2 file and the largest remaining gap in this review.
- **The `entrypoints/` and `cli/` layers were inventoried and spot-checked, not reviewed in depth.** `worker.ts` (265 lines) and `http.ts` (260) are the two largest and both deserve their own pass.
- **One destructive-CLI finding was verified by reading, not by running.** `clean-test-data.ts` was never executed - deliberately. Its blast radius is inferred from the SQL it issues.
- **Nothing was fixed.** No code was changed by this review.
- **The dev-stub finding (L2-P01-03) does not affect production** and I have said so explicitly rather than letting the finding read as a production defect.
- **I corrected one of my own claims mid-review** (the `keyVersion` default). It is recorded as a self-correction rather than quietly dropped.


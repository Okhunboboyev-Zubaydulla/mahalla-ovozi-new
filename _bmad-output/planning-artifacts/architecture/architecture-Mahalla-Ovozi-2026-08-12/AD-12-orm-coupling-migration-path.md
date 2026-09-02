# AD-12 — Drizzle ORM Pragmatic Coupling and Repository Port Migration Path [DEFERRED]

**Date:** 2026-09-01
**Status:** DEFERRED — architectural debt documented; migration planned for post-MVP
**Relates to:** AD-1 (hexagonal monolith), AD-4 (Drizzle schema ownership)

---

## Context

The codebase implements a hexagonal modular monolith (AD-1) where domain logic should depend only on ports (interfaces), not on adapter internals. However, during the sprint-driven MVP build, domain modules in `apps/backend/src/modules/` were written to import Drizzle ORM types directly:

- `DbClient`, `DbOrTx`, `DbTransaction` (typed as Drizzle-specific `ReturnType` chains) are imported across ~50 domain files
- Drizzle table definitions (`adapters/db/schema/*.ts`) are imported directly by domain repositories to build queries
- `TransactionScope.tx` in `boss-client.ts` is typed as `NodePgDatabase<typeof schema>` — a concrete Drizzle type passed into domain callbacks

### Extent of coupling (as of 2026-09-01 deepening review)

| Layer | Coupling type | Scope |
|:---|:---|:---|
| Domain modules | Import `DbClient / DbOrTx / DbTransaction` from `adapters/db/client.ts` | ~50 files |
| Domain repositories | Import Drizzle table definitions from `adapters/db/schema/*` directly | ~50 files |
| `withTransactionalIntake` callers | Receive `TransactionScope.tx: NodePgDatabase<typeof schema>` | 2 modules |

### Why this was acceptable during MVP

AD-4 explicitly adopts Drizzle as the persistence layer. During sprint-driven MVP development, introducing repository port interfaces would have:
1. Added ~100 new interface files before any domain logic was written
2. Required maintaining dual surfaces (port + Drizzle implementation) for 16 schema tables
3. Provided no runtime benefit (only one implementation exists; no test substitution needed)

The pragmatic choice was made to use `DbOrTx` as the effective repository port. This is a well-understood tradeoff with a known migration path.

---

## Decision

**Deferred with documented migration path.** The current ORM coupling is:
- **Stable** — the Drizzle types are consistent and TypeScript-enforced
- **Not a source of bugs** — all modules use the same pattern
- **No circular dependencies detected**
- **Acceptable for single-host single-DB MVP** (AD-11)

Migration is warranted when:
- Test isolation requires in-memory repository doubles, OR
- A second persistence backend is introduced (e.g., read replica, external cache), OR
- The codebase grows past the point where Drizzle type changes cascade across too many modules

---

## Migration Path (for future sprint)

### Phase A — Repository Port Interfaces (per domain module)

For each domain module, extract a `{module}-repository.port.ts` interface file:

```typescript
// Example: modules/districts/district-repository.port.ts
export interface DistrictRepository {
  findById(id: string): Promise<District | null>;
  findAll(): Promise<District[]>;
  create(data: CreateDistrictInput): Promise<District>;
  update(id: string, data: UpdateDistrictInput): Promise<District>;
  delete(id: string): Promise<void>;
}
```

The Drizzle implementation moves to `adapters/db/repositories/{module}-drizzle-repository.ts`.

Priority order (by churn frequency from git log):
1. `telegram-intake` repository
2. `topics` repository
3. `ai` operations repository
4. `districts` repository
5. Remaining modules

### Phase B — Decouple TransactionScope

Replace `TransactionScope.tx: NodePgDatabase<typeof schema>` with a domain-friendly `UnitOfWork` port:

```typescript
// modules/shared/unit-of-work.port.ts
export interface UnitOfWork {
  enqueueJob<K extends BossQueueName>(
    queueName: K,
    data: BossQueueMap[K],
    options?: JobOptions,
  ): Promise<void>;
  // Domain operations delegated through repository ports, not raw tx
}
```

This allows `withTransactionalIntake` to remain in the adapter layer while domain callbacks depend only on the port.

---

## Consequences

- **Current cost:** ~50 files import Drizzle types; schema changes cascade broadly
- **Migration cost:** ~100 new interface files + ~50 implementation files to update
- **Deferral risk:** Low — Drizzle is pinned; schema is stable during MVP sprints
- **Trigger:** Re-evaluate at Epic 8 (post-MVP) or when test isolation becomes a pain point

---

## Related Changes (deepening review 2026-09-01)

As a bounded improvement within this review, `boss-client.ts` was split:
- `adapters/jobs/job-types.ts` — job payload interfaces, queue constants, BossQueueMap (contract layer)
- `adapters/jobs/boss-client.ts` — pg-boss infrastructure (factory, dispatcher, transactional scope)

This separates **what jobs exist** from **how to send them**, without requiring any domain module changes.

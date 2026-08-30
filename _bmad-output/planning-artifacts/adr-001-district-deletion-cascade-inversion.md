---
id: ADR-001
title: District Deletion Cascade Inversion
status: accepted
date: '2026-08-30'
deciders: [Zubaydulla, Winston (System Architect)]
spine-invariants: [AD-1, AD-3, AD-9, AD-11]
supersedes: ~
---

# ADR-001 — District Deletion Cascade Inversion

## Status

**Accepted** — 2026-08-30. Pending implementation (two-phase, story-driven).

---

## Context

`apps/backend/src/modules/subscriptions/district-deletion-service.ts` (734 LOC) contains `executeDistrictLiveDeletion`, which manually orchestrates 15 sequential `DELETE` operations across tables owned by every other module in the system:

```
topic_projections · accepted_evidence · topics
ai_provider_attempts · ai_operations
telegram_intake_records
district_analysis_settings_drafts · district_analysis_settings_versions
operational_issues · user_dashboard_visits
sessions · accounts
district_telegram_groups · district_telegram_bots
audit_events · district_subscriptions · districts
```

Two of these use raw `sql` template strings that bypass the Drizzle schema exports entirely (`ai_provider_attempts`, `sessions`).

This violates AD-1 (domain-oriented modules that own their internals): the `subscriptions` module knows the intimate database schema of every other module. Adding any table to any module requires modifying `district-deletion-service.ts`. The pattern does not scale and creates an invisible maintenance trap.

The problem was identified during the post-Epic 6 codebase deepening review as the highest-leverage candidate for structural improvement.

---

## Decision

**Invert the cascade.** Each module participating in district deletion exposes a `deleteDistrictData(tx, districtId)` contract. The deletion service becomes a pure orchestrator that holds a typed array of cleaners and iterates them in FK topological order, without knowing which tables each cleaner touches.

### Interface contract

The `DistrictDataCleaner` interface is defined **in the `subscriptions` module** (the orchestrator). Each participating module exports a factory function returning a conforming object:

```typescript
// apps/backend/src/modules/subscriptions/ports/district-data-cleaner.ts
export interface DistrictDataCleaner {
  readonly moduleName: string;
  deleteDistrictData(tx: DbTransaction, districtId: string): Promise<void>;
}
```

The `DbTransaction` type is exported from `adapters/db/client.ts`.

### Module responsibilities

Each module is responsible for its own schema cleanup. The deletion service array encodes the required FK topological order with an explanatory comment block:

```typescript
// FK order matters: child tables before parent tables.
// 1. topic_projections before accepted_evidence before topics
// 2. ai_provider_attempts (raw SQL inside ai cleaner) before ai_operations
// 3. sessions (raw SQL inside auth cleaner) before accounts
const cleaners: DistrictDataCleaner[] = [
  topicsDataCleaner,
  aiDataCleaner,
  telegramIntakeDataCleaner,
  analysisSettingsDataCleaner,
  issuesDataCleaner,
  authDataCleaner,
  telegramGroupsDataCleaner,
  telegramBotsDataCleaner,
  auditDataCleaner,
  subscriptionsDataCleaner,
];
```

### Special cases

**D-1 — Deletion lifecycle artefacts:** `del_fail:<districtId>` operational issue records are deletion-process artefacts, not district domain data. The deletion service deletes them directly. The `issues` module's `deleteDistrictData` covers only district-scoped `operationalIssues` rows.

**D-3 — Raw SQL tables:** `ai_provider_attempts` and `sessions` are currently deleted via raw SQL because they have no named Drizzle schema export. These raw SQL deletes move into their owning modules (`ai` and `auth` respectively) as implementation details of `deleteDistrictData`. If either table is later promoted to a named Drizzle schema, only the owning module changes.

### Migration strategy (D-5)

Two-phase incremental migration to protect the correctness-critical deletion path:

**Phase 1** — Per-module migration (independently shippable stories):
1. Define the `DistrictDataCleaner` interface and `DbTransaction` export.
2. For each module, in order: implement `deleteDistrictData`, register the cleaner in the array at the correct FK position, remove the corresponding inline delete from the cascade.
3. The original inline deletes serve as a safety net until each module's cleaner is verified.

**Phase 2** — Test rewrite (one story):
1. Rewrite deletion service tests to use mock `DistrictDataCleaner[]` implementations (no database required).
2. Add per-module `deleteDistrictData` integration tests against `mahalla_ovozi_test`.
3. Retire the existing monolithic full-cascade integration test.
4. One thin E2E smoke test validates the full chain.

---

## Consequences

### Positive

- **Locality**: each module owns its schema cleanup; adding a new table to any module no longer requires touching `subscriptions`.
- **Interface reduction**: deletion service drops 15+ schema imports; its implementation becomes ~30 LOC of orchestration.
- **Test surface**: deletion service correctness (sequencing, tombstone, audit, tombstone store) is testable without seeding a full district. Each module's cleanup is independently verifiable.
- **Leverage**: new tables are automatically covered by their owning module's `deleteDistrictData`; no manual cascade update required.
- **AD-1 alignment**: modules own their internals; `subscriptions` depends on a project-owned interface, not on foreign schemas.

### Negative / Risks

- **Implementation effort**: ~8 modules each need a `deleteDistrictData` function plus an isolated integration test. Estimated: 2–3 story-sized chunks.
- **FK ordering remains implicit**: the `DistrictDataCleaner[]` array position encodes correctness. A mis-ordered cleaner produces a FK constraint violation at runtime. Mitigated by: documented comment block in the array, integration test per module that exercises foreign key relationships, and the E2E smoke test.
- **Phase 1 / Phase 2 split**: during Phase 1, the deletion path is partially hybrid (some inline, some cleaners). This is intentional and safe because each step removes exactly one inline delete while adding its equivalent cleaner.

---

## Alternatives Considered

### Keep the cascade centralized

The current approach. Rejected because it scales linearly with module additions: every new table in any module requires a human to remember to update `district-deletion-service.ts`. The failure mode (forgetting) is silent at development time and produces orphaned rows in production.

### Rely on PostgreSQL CASCADE foreign keys

Would eliminate application-level delete ordering entirely. Rejected for MVP because: (1) it requires schema migration with CASCADE constraints on all 15 relationships, (2) it makes deletion behavior opaque and harder to audit, (3) the existing Drizzle schema does not define these constraints. Not blocked — could be a future AD if the cascade grows beyond manageable size.

### Add `ai_provider_attempts` and `sessions` as named Drizzle schema tables first, then invert

Cleaner long-term. Rejected as a prerequisite because it adds a schema migration step before the architectural change can land. The raw SQL can move into the owning module as an implementation detail today; the schema promotion is independent and can follow later.

### Hybrid: old modules stay in cascade, new modules use interface

Creates two classes of module with different obligations. Permanently bifurcates the pattern. Rejected.

---

## Alignment with Architecture Spine

| Invariant | Alignment |
|-----------|-----------|
| **AD-1** (hexagonal modular monolith) | Direct: modules own their internals; no cross-module schema imports |
| **AD-3** (atomicity) | Preserved: all cleaners run inside one shared `DbTransaction`; the interface requires tx participation |
| **AD-9** (District scope) | Preserved: `districtId` is explicitly required by the interface; missing scope remains an error |
| **AD-11** (deletion reconciliation) | Preserved: tombstone, backup expiry record, and external tombstone store writes remain in the deletion service; modules clean data only |

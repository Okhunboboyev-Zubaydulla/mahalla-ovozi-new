---
project_name: 'Mahalla-Ovozi'
user_name: 'Zubaydulla'
date: '2026-08-17'
sections_completed:
  - technology_stack
  - language_specific_rules
  - framework_specific_rules
  - testing_rules
  - code_quality_style_rules
  - development_workflow_rules
  - critical_dont_miss_rules
existing_patterns_found: 8
---

# Project Context for AI Agents

_Implementation rules that AI agents must follow in this repository. Keep this
file lean: load referenced authoritative artifacts when deeper context is needed._

## Technology Stack & Versions

- Node.js 24.x; pnpm 11.21.0; TypeScript 6.0.3; ESM.
- Backend: Fastify 5.10.0, Drizzle ORM 0.45.2, Drizzle Kit 0.31.10,
  `pg` 8.23.0, Argon2 0.45.1.
- Web: React 19.2.8, React Router 8.3.0 via `react-router`,
  Vite 8.2.1, Ant Design 6.6.0, TanStack Query 5.101.4.
- Shared contracts: Zod 4.4.3.
- Tests: Vitest 4.1.10, Playwright 1.60.0.
- Architecture baseline: PostgreSQL 18.x, pg-boss 12.x,
  Caddy 2.11.x, pgBackRest 2.59.x, OpenTelemetry.

For already-installed dependencies, package manifests and `pnpm-lock.yaml`
are the exact-version source of truth. Architecture decisions govern allowed
technology families and constraints.

## Critical Implementation Rules

### Language-Specific Rules

- Preserve the repository's full TypeScript strictness. Do not weaken compiler
  settings or use `any`, broad casts, or non-null assertions merely to bypass errors.
- Validate external/runtime data explicitly at trust boundaries.
- Use `import type` for type-only imports.
- Backend NodeNext relative imports use runtime `.js` specifiers; do not blindly
  apply that convention to browser packages using Bundler resolution.
- Prefer immutable explicit types and functional application/domain logic with
  explicit dependency injection.
- Fail explicitly. Do not silently swallow errors or convert failures into
  fallback success.

### Framework-Specific Rules

- Maintain the hexagonal modular-monolith dependency direction:
  domain/application code may depend on project-owned ports, never infrastructure
  adapters or provider SDKs.
- Keep the frontend a React SPA. Use `react-router`; do not introduce
  `react-router-dom`, Next.js, SSR, RSC, or server actions without an approved
  architecture change.
- Use TanStack Query for remote state and React state/context for local UI or
  narrowly scoped orchestration. Do not add another global state framework
  without a concrete requirement.
- Ant Design is the primary UI system; prefer its components and design tokens
  over a parallel styling/component framework.
- API contracts belong in `@mahalla-ovozi/api-contracts` and are runtime-validated
  with Zod. Database rows, provider SDK objects, and job payloads must not become
  public API contracts.
- Do not hold database transactions open across AI/provider/network calls.

### Testing Rules

- Add the smallest set of tests that materially proves the changed behavior.
- Prefer integration, smoke, and end-to-end tests where meaningful boundaries
  are involved.
- Test PostgreSQL-dependent semantics against real PostgreSQL when transactions,
  constraints, persistence, locking, or rollback are part of the behavior.
- Preserve the backend integration suite's intentional serial execution unless
  database isolation is deliberately redesigned.
- Mock only at an appropriate external boundary; browser API-client tests may
  stub `fetch`.
- Treat important failure paths as first-class behavior.
- Do not invent a repository-wide coverage percentage.

### Code Quality & Style Rules

- Match surrounding repository conventions; do not introduce new style,
  architecture, linting, or formatting conventions opportunistically.
- Prefer small, cohesive, single-purpose functions/modules.
- Do not use default parameter values or flag parameters that switch one
  function between unrelated behaviors.
- Check for existing project-owned logic/contracts before creating duplicates.
- Keep changes narrowly scoped; no unrelated refactors or abstractions.
- Code is the primary implementation documentation. Add comments/docs only for
  non-obvious invariants, rationale, or constraints that code cannot express well.

### Development Workflow Rules

- Read the affected implementation and relevant project instructions before
  modifying code.
- Do not create Git commits unless explicitly requested.
- Use the pnpm workspace and keep the lockfile consistent.
- Database schema changes must leave generated Drizzle migration artifacts current.
- Do not claim verification for checks that were not run.
- When code changes are complete, run the applicable repository verification.
  Full CI currently verifies migrations, applies migrations, typechecks, builds,
  runs PostgreSQL integration tests, web tests, and Playwright tests.
- Do not invent branch, PR, or commit-message policies that the repository has
  not established.

### Critical Don't-Miss Rules

Detailed product and architecture invariants remain authoritative in:

`_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md`

Read the relevant architecture decisions before designing or modifying:

- AI context, AI providers, stale-result/concurrency behavior → AD-5 through AD-8.
- PostgreSQL durability, jobs, ordering, idempotency, migrations → AD-3 and AD-4.
- Authentication, authorization, District isolation, secrets → AD-9.
- Browser/API state, District switching, protected caching → AD-10.
- Deployment, backup/recovery, observability → AD-11.
- Overall module/dependency structure or technology choices → AD-1 and AD-2.

Never substitute a simplified implementation for an architecture invariant merely
because it is easier. In particular, changes involving AI context, District scope,
durability, authentication, lifecycle, retention, or concurrency require reading
the relevant adopted architecture decision before implementation.

Also load task-specific authoritative context when relevant:

- Active implementation requirements:
  `_bmad-output/implementation-artifacts/`
- Product requirements:
  `_bmad-output/planning-artifacts/prds/`
- UX requirements:
  `_bmad-output/planning-artifacts/ux-designs/`
- Repository-wide engineering/workflow rules:
  `/AGENTS.md`

The active story/task remains authoritative for its acceptance criteria. Do not
copy detailed story, PRD, UX, or architecture content into this file unless a
short always-loaded reminder is necessary to prevent repeated implementation mistakes.
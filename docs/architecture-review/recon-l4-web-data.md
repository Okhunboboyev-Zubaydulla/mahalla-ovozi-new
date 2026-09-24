# Recon L4 — Web data layer (churn-guided sweep)

| Field | Value |
|---|---|
| Task | t4 (recon-l4) |
| Layer | L4 web data |
| Owner | recon-l4-webdata |
| Status | **incomplete (1 of 15)** — the sweep ended after its first finding; see note below |
| Baseline | HEAD `bdf999a` |
| Scope | `apps/web/src/{api,auth,district,topics,hooks,lib,issues,health,utils}` — 48 files, ~5,131 LOC |
| Kind | RECONNAISSANCE (sweep, not a deep phase) |
| Findings | 0 blocker · 2 high · 8 medium · 5 low |
| ADR lens | ADR-0007 observed only, not filed (L3 auth owns it) |

**This artifact recommends. It funds nothing and decides nothing.** No deep phase is authorised by this document.

> **STATUS CORRECTION (2026-09-24) — this sweep is INCOMPLETE.** The `Findings` row above (`0 blocker · 2 high · 8 medium · 5 low` = 15) states the *intended* scope of the sweep, not what was written. The document body contains **one** finding — `L4-P01-01` — and then stops, mid-sentence relative to its own claim that *"Both `high` findings below"*. The earlier `Status: complete` was wrong and contradicted `INDEX.md`'s register row (`incomplete (1 of 15)`); the register was right. **No L4 conclusion beyond `L4-P01-01` may be relied on.** Completing the sweep is a re-run of L4, which is a funding decision for the gate — not a repair, and not authorised by this correction.

## Phase question and method

**Question.** Is the L4 web data layer a designed seam, or a collection of independently-grown fetch-and-cache call sites that happen to share a helper?

**Answer (short).** The *transport* half is genuinely designed and single-owned: exactly one `fetch(` exists in the entire web application, and every request passes the same runtime schema-validation gate. The *cache-coordination* half is not designed: query keys are centralised for one domain (district) and hand-written literals everywhere else, four hooks derive tenant identity from the auth context instead of the district context, and cross-module cache invalidation is done with untyped string literals that no type checker can verify. The layer is **not unhealthy** — the boundary that exists is real and load-bearing — but its cache key space has no owner, and that is the friction worth naming.

**Method.** Read-only static analysis. Deep-module vocabulary (module, interface, depth, seam, locality) with the **deletion test** as the primary instrument: for each suspected shallow module I asked whether deleting it would *concentrate* complexity into a smaller number of callers (a real module) or merely *move* it (a pass-through to be recorded and dropped). Churn from the task brief (`useHokimTopicBoard.ts` 17 touches, `lib/formatters.ts` 13, `auth-context.tsx` 8, `hokim-topics-client.ts` 8, `useTopicStatistics.ts` 8, `useTopicEvidence.ts` 7, `district-context.tsx` 6) was used to bias attention, then the net was widened: every one of the 48 in-scope files was enumerated with line counts, and 29 were read end to end.

**Instrument check.** No test suite was executed. Per the task contract, test execution is permitted only to confirm or refute a finding already rated `high` **and** `inferred`, capped at two approved runs. Both `high` findings below are rated `observed` (the evidence is the literal source line, not an inference about runtime behaviour), so the allowance was not spent. Browser-based verification is out of reach in this environment (no Playwright, no dev server) and no finding depends on it.

**Deliberately not filed.** ADR-0007 (stateful sessions over JWT) is owned by the L3 auth phase. One session observation is recorded in the Cross-references section as a one-line note with **no finding id**, per the ownership rule. ADR-0001, ADR-0006 and ADR-0008 are L6-exclusive and are not filed against here.

## Friction map

### Read end to end (29 files)

`apps/web/src/lib/api-client.ts` · `apps/web/src/lib/formatters.ts` · `apps/web/src/lib/scrollUtils.ts` · `apps/web/src/auth/auth-client.ts` · `apps/web/src/auth/auth-context.tsx` · `apps/web/src/auth/ProtectedRoute.tsx` · `apps/web/src/district/district-context.tsx` · `apps/web/src/district/district-client.ts` · `apps/web/src/district/query-keys.ts` · `apps/web/src/district/hokim-account-client.ts` · `apps/web/src/district/telegram-bot-client.ts` · `apps/web/src/district/telegram-group-client.ts` · `apps/web/src/district/useDirtyState.ts` · `apps/web/src/district/useDistrictActivation.ts` · `apps/web/src/district/useDistrictReadiness.ts` · `apps/web/src/district/useHokimAccount.ts` · `apps/web/src/district/useTelegramBot.ts` · `apps/web/src/district/useTelegramGroups.ts` · `apps/web/src/district/index.ts` · `apps/web/src/topics/hokim-topics-client.ts` · `apps/web/src/topics/district-topics-client.ts` · `apps/web/src/topics/useDistrictMahallas.ts` · `apps/web/src/topics/useHokimTopicBoard.ts` · `apps/web/src/topics/useTopicStatistics.ts` · `apps/web/src/topics/useTopicEvidence.ts` · `apps/web/src/topics/index.ts` · `apps/web/src/hooks/useSignalMessages.ts` · `apps/web/src/hooks/useDistrictAnalysisSettings.ts` · `apps/web/src/hooks/useDashboardFilterParams.ts` · `apps/web/src/hooks/useTopicReadState.tsx` · `apps/web/src/hooks/useLaneOrderPreference.ts` · `apps/web/src/hooks/useLiveAnnouncer.ts` · `apps/web/src/hooks/useOnlineStatus.ts` · `apps/web/src/hooks/usePrefersReducedMotion.ts` · `apps/web/src/hooks/useBottomSentinelObserver.ts` · `apps/web/src/hooks/useFocusFallback.ts` · `apps/web/src/issues/issues-client.ts` · `apps/web/src/issues/useOperationalIssues.ts` · `apps/web/src/health/health-client.ts` · `apps/web/src/health/useSystemHealth.ts` · `apps/web/src/api/audit-client.ts` · `apps/web/src/api/signals-client.ts` · `apps/web/src/api/district-settings-client.ts` · `apps/web/src/api/subscription-client.ts` · `apps/web/src/utils/duration-format.ts` · `apps/web/src/utils/mahalla-colors.ts` · `apps/web/src/App.tsx` (read as the provider/QueryClient composition root).

### Skimmed by targeted grep only (not read end to end)

`apps/web/src/topics/useDistrictMahallas.ts` was read; `apps/web/src/hooks/useLaneOrderPreference.test.ts` was located but only its import and `renderHook` shape were inspected via grep. Consumers outside the L4 scope (under `apps/web/src/components/**` and `apps/web/src/pages/**`) were examined **only** through grep hit lists — `apps/web/src/pages/SubscriptionsPage.tsx`, `apps/web/src/pages/HokimDashboardPage.tsx`, `apps/web/src/pages/TopicEvidencePage.tsx`, `apps/web/src/pages/DistrictsPage.tsx`, `apps/web/src/components/ai/SignalMonitoringTable.tsx`, `apps/web/src/components/topics/MahallaSelect.tsx`, `apps/web/src/components/DistrictSelector.tsx` — sufficient to establish that a call site exists and which key literal it uses, not sufficient to judge their internal structure. Those files belong to L5.

### Not examined at all (out of scope, named for honesty)

`apps/web/src/district/useDistrictWorkspace.ts` (545 lines — the single largest in-scope file) was **not** read end to end; its query keys and invalidation pairs were captured through grep only (`:131-172` five `useQuery` declarations, `:184-442` eleven `useMutation` blocks). `apps/web/tests/**` was enumerated by grep but no test file was read in full. `packages/api-contracts/src/**` is L1 scope. `.env` files were never opened. `apps/web/src/theme`, `apps/web/src/components`, `apps/web/src/pages` are L5.

## Findings

### L4-P01-01 — One query-key slot is bound to two different endpoints, so two hooks silently share a cache entry

| Field | Value |
|---|---|
| Category | correctness, hidden-dependency |
| Severity | **high** |
| Strength | strong |
| Confidence | high |
| Verification | observed |
| Location | `apps/web/src/topics/useDistrictMahallas.ts:10`, `apps/web/src/topics/district-topics-client.ts:134`, `apps/web/src/topics/hokim-topics-client.ts:105` |

**Description.** Two different hooks, in two different files, declare the *same* query key `['district-mahallas', districtId]` but call *different* HTTP endpoints that return *different* payload shapes. TanStack Query keys are the cache identity: whichever hook mounts first populates the entry, and the second hook reads the first hook's data without issuing its own request (until its own `staleTime` expires). Because the two hooks have different `staleTime` values (15 minutes vs 60 seconds), the staleness of the shared entry depends on mount order — a caller cannot reason about freshness from its own code.

**Verbatim evidence.**
```
// apps/web/src/topics/useDistrictMahallas.ts:9-16
  const query = useQuery({
    queryKey: ['district-mahallas', districtId],
    queryFn: ({ signal }) => hokimTopicsClient.getDistrictMahallas(signal),
    enabled: Boolean(districtId && actor?.role === 'DISTRICT_HOKIM'),
    staleTime: 15 * 60 * 1000, // 15 minutes
    networkMode: 'online',
    retry: 2,
  });
```
```
// apps/web/src/topics/district-topics-client.ts:132-138
export function useDistrictTopicsMahallas(districtId: string | null) {
  return useQuery<DistrictMahallasResponse, Error>({
    queryKey: ['district-mahallas', districtId],
    queryFn: ({ signal }) => districtTopicsClient.listMahallas(districtId!, signal),
    enabled: Boolean(districtId),
    staleTime: 60_000,
  });
}
```
The two queryFns resolve to different URLs and different return types:
```
// apps/web/src/topics/hokim-topics-client.ts:105-115
  async getDistrictMahallas(signal?: AbortSignal): Promise<string[]> {
    const response = await request<{ mahallas: string[] }>(
      '/api/v1/hokim/topics/mahallas',
      {
        method: 'GET',
        signal,
      },
      HokimMahallasResponseSchema,
    );
    return response.mahallas;
  },
```
```
// apps/web/src/topics/district-topics-client.ts:60-72
  async listMahallas(
    districtId: string,
    signal?: AbortSignal,
  ): Promise<DistrictMahallasResponse> {
    return request<DistrictMahallasResponse>(
      `/api/v1/districts/${encodeURIComponent(districtId)}/topics/mahallas`,
      {
        method: 'GET',
        signal,
      },
      DistrictMahallasResponseSchema,
    );
  },
```
Both call sites already exist and already disagree about which function the shared name means:
```
// apps/web/src/components/topics/MahallaSelect.tsx:4, :19
import { useDistrictMahallas } from '../../topics/useDistrictMahallas.js';
  const { mahallas, isLoading } = useDistrictMahallas();
```
```
// apps/web/src/components/ai/SignalMonitoringTable.tsx:38, :170
import { useDistrictMahallas } from '../../topics/district-topics-client.js';
  const { data: districtMahallasData } = useDistrictMahallas(districtId || null);
```

**Why it matters.** This is the concrete answer to the brief's question "can two call sites disagree about the same cache entry?". They do not merely disagree — one of them can be served the other's payload shape from cache. The `HokimMahallasResponseSchema` (`{ mahallas: string[] }`) and `DistrictMahallasResponseSchema` are different Zod schemas, so whichever hook is served a foreign entry will hand a structurally wrong object to a consumer that typed against its own `*Response`. The schema gate in `lib/api-client.ts` cannot catch this, because both payloads were individually valid when they were *fetched* — the corruption happens in the cache, after validation.

**Deletion test.** `useDistrictMahallas` (the 25-line file) — delete it and complexity does **not** vanish: `hokimTopicsClient.getDistrictMahallas` would still be called from somewhere and the key collision would still exist under a different name. The collision lives in the *key*, not in the file. Deleting the file concentrates nothing; therefore the file is not the shallow module to remove. The finding is on the key.

**Fix direction.** Give the `district-mahallas` key a single owner. Either (a) delete `useDistrictMahallas.ts` and route `MahallaSelect.tsx` to `useDistrictTopicsMahallas(activeDistrictId)` — which requires accepting that the district route returns a richer payload than `string[]` — or (b) move the key into a factory and give the two endpoints distinguishable slots (`['district-mahallas', 'hokim', districtId]` vs `['district-mahallas', 'district', districtId]`). Option (a) is the concentration; option (b) is the minimum safe fix if the two endpoints are genuinely both needed.

**Acceptance criteria.** (1) No two `useQuery` call sites in `apps/web/src` declare the same query key with queryFns hitting different URL paths. (2) A single exported symbol owns the key for `/api/v1/hokim/topics/mahallas`. (3) The barrel `apps/web/src/topics/index.ts` exports at most one symbol named `useDistrictMahallas`.

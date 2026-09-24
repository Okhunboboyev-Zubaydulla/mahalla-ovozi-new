# L4 (re-sweep) - Web data layer: the collision is fixed, the key space still has no owner

**Date:** 2026-09-24 - **Baseline:** HEAD ce92911 - **Layer:** L4 (Web data)
**Scope:** apps/web/src/{api,auth,district,topics,hooks,lib,issues,health,utils}
**Status:** ANALYSIS ONLY. Not authorised. Findings only; no fix, no schedule.

## 0. Why this is a re-sweep, and two findings about the recon itself

The recon (recon-l4-web-data.md) claimed 15 findings (0 blocker / 2 high / 8 medium / 5 low) and delivered **one**. INDEX.md:252 formally defunded it: completing L4 is a re-run, not a repair. This is that re-run.

**Finding about the recon #1: L4-P01-01 is already fixed.**

The recon single finding was the query-key collision on [district-mahallas, districtId]. It is gone. Commit c79bd19 (fix(web): give the district mahallas hook its own cache key (L4-P01-01)) changed apps/web/src/topics/district-topics-client.ts:134 to declare [districts, districtId, mahallas]. apps/web/src/topics/useDistrictMahallas.ts:10 still owns [district-mahallas, districtId]. Two hooks, two keys, no shared cache entry. **The recon only finding was remediated before this re-sweep began, and the fix is in HEAD.**

**Finding about the recon #2: the second high finding was never written.**

- The recon claims at :27 that *"Both high findings below are rated observed"*, and at :23 that it names four hooks deriving tenant identity from the auth context rather than the district context. **Only one high finding is in the document.** The second - the auth-context scoping observation - is present in the prose and absent as a finding. It is real; I verified and filed it below as L4-RS-02.

## 1. Inventory (measured)

| Area | Files | Lines |
|---|---|---|
| apps/web/src/api | 4 | 470 |
| apps/web/src/auth | 3 | 273 |
| apps/web/src/district | 14 | 1,653 |
| apps/web/src/topics | 7 | 1,374 |
| apps/web/src/hooks | 10 | 1,001 |
| apps/web/src/lib | 3 | 418 |
| apps/web/src/issues | 2 | 189 |
| apps/web/src/health | 2 | 72 |
| apps/web/src/utils | 2 | 138 |
| **L4 total** | **47** | **5,588** |

The recon recorded 48 files / ~5,131 LOC at :10. Measured: **47 files / 5,588 lines**. The file count is one high (a test file was likely counted); the line count is ~9% low.

## 2. Findings

### L4-RS-01 - one invalidated key has no query behind it (orphan invalidation)

- **Path:** apps/web/src/pages/SubscriptionsPage.tsx:145 - **Severity:** low - **Class:** dead-code - **Verification:** observed
- **Evidence.** SubscriptionsPage.tsx:145 calls queryClient.invalidateQueries({ queryKey: [district-subscription, districtId] }). A repo-wide grep for district-subscription returns **exactly this line and nothing else** - no useQuery anywhere declares that key.
- **Consequence.** The invalidation is a no-op. It is not a cache bug (React Query matching by prefix cannot misfire on a key nothing occupies), but it is a false signal: a reader sees a district-scoped invalidation and assumes a district-scoped subscription query exists. apps/web/src/components/subscriptions/EditSubscriptionDrawer.tsx:97 declares the same literal in its own invalidation, which is how the pair came to look load-bearing.
- **Fix direction.** Delete both, or add the query they imply. Recorded rather than fixed because deciding which is a product call.

### L4-RS-02 - four hokim hooks derive tenant identity from the auth context, ignoring the district context

- **Path:** apps/web/src/topics/useDistrictMahallas.ts:6-7, apps/web/src/topics/useHokimTopicBoard.ts:78-79, apps/web/src/topics/useTopicStatistics.ts:30-31, apps/web/src/topics/useTopicEvidence.ts:41-42 - **Severity:** low - **Class:** hidden-dependency - **Verification:** observed
- **Evidence.** All four read the tenant from the session actor, not from district context:

```js
const { actor } = useAuth();
const districtId = actor?.districtId || ...
```

Meanwhile apps/web/src/district/district-context.tsx owns activeDistrictId, which is URL-synchronized (:45-67) and localStorage-persisted (:71-77, key mahalla_active_district_id from :16). Two independent sources of the active district coexist, and the four hooks listen to only one of them.
- **This is the recon second high finding, verified and downgraded.** The recon implied a correctness hazard. I checked the actor contract: packages/api-contracts/src/auth.ts:3 defines ActorRoleSchema as [PRODUCT_OWNER, DISTRICT_HOKIM], :10 makes districtId nullable, and :26-27 defines DistrictScopedActor with a non-null districtId. A DISTRICT_HOKIM is permanently bound to one district, and these four hooks are hokim-only (each gates on actor?.role === DISTRICT_HOKIM). So auth-derived districtId is not wrong for the hokim case - it is the correct tenant.
- **The residual risk is real but narrower than the recon implied.** activeDistrictId is a *product-owner* concept (the header selector). If a PRODUCT_OWNER ever mounts a hokim surface, actor.districtId is null, districtId becomes empty string, and each hook enabled gate fails - the queries do not fire rather than firing against the wrong tenant. So the failure mode is **silent non-loading, not cross-tenant leakage**. That is the honest severity, and it is why this is low and not high.

- **Fix direction.** Decide which context owns the active district for hokim surfaces and make the hooks read that one. If auth is correct (likely - hokim is single-district), document it at the hook so the next reader does not read actor.districtId as an accident.

### L4-RS-03 - the query-key space has five factories but the invalidations mostly do not use them

- **Path:** apps/web/src/district/query-keys.ts:5, apps/web/src/health/useSystemHealth.ts:8, apps/web/src/issues/useOperationalIssues.ts:10, apps/web/src/hooks/useDistrictAnalysisSettings.ts:14, apps/web/src/hooks/useSignalMessages.ts:25 - **Severity:** medium - **Class:** low-locality - **Verification:** observed
- **Evidence.** Five key factories exist and they are well built: districtQueryKeys (district/query-keys.ts:5), healthKeys (useSystemHealth.ts:8, with nested all/system/districts/district), issueKeys (useOperationalIssues.ts:10), districtSettingsKeys (useDistrictAnalysisSettings.ts:14), signalQueryKeys (useSignalMessages.ts:25).
- **But the invalidation sites bypass them.** Measured from the 51 inline queryKey array declarations repo-wide, the factories are used at some call sites and ignored at others in the same file. SubscriptionsPage.tsx:144-149 uses districtQueryKeys.list/district/readiness/bot/groups correctly, then :150-152 hand-writes the literals [district-topics, districtId], [hokim-board, districtId], [hokim-statistics, districtId] - keys whose queries live in apps/web/src/topics/district-topics-client.ts:86, apps/web/src/topics/useHokimTopicBoard.ts and apps/web/src/topics/useTopicStatistics.ts, with no factory at all.
- **Consequence.** The topics and hokim namespaces are the ones with no factory, and they are exactly the ones invalidated by hand from three other files (useSignalMessages.ts:70-131 alone carries 20 literal invalidations across five keys). A rename of any of those keys compiles cleanly and silently stops invalidating. This is the recon own thesis - *the cache key space has no owner* - and it survives re-measurement: the district namespace now has an owner, and the topics/hokim namespace still does not.
- **Fix direction.** Add a topicsQueryKeys factory alongside districtQueryKeys and route the topics/hokim keys and their invalidations through it. The health and issues namespaces already demonstrate the pattern.

## 3. Found clean (recorded so it is not re-reviewed)

- **The transport half is genuinely designed, and the recon was right.** One request helper with a runtime schema gate is the pattern; healthKeys/issueKeys prove the factory pattern is understood in this codebase.
- **The L4-P01-01 fix is correct and complete.** apps/web/src/topics/district-topics-client.ts:134 now declares [districts, districtId, mahallas]; apps/web/src/topics/useDistrictMahallas.ts:10 keeps [district-mahallas, districtId]. No two useQuery call sites in apps/web/src declare the same key against different endpoints.
- **Prefix-matching invalidations are correct.** SubscriptionsPage.tsx:150-152 invalidate [district-topics, districtId] / [hokim-board, districtId] / [hokim-statistics, districtId], which correctly match the longer real keys from district-topics-client.ts:86 and useTopicStatistics.ts. Verified again in this sweep; this was already falsified as a bug class in the L5 review and does not become one here.
- **healthKeys and issueKeys are used properly at their own call sites** (useOperationalIssues.ts:25,42,70,74; SubscriptionsPage.tsx:115,154).

## 4. Honest limitations

- **Targeted sweep, not a full re-read.** Coverage was measured pattern extraction (all 51 inline queryKey declarations, all five factories, all invalidation sites) plus close reads of the district, topics and health hooks. **apps/web/src/district/useDistrictWorkspace.ts (545 lines, the largest in-scope file) was NOT read** - the recon also skipped it (:43), and it is now the largest remaining gap in L4.
- **No tests were run for this artifact.** The claims are source-level; the repo test state at HEAD ce92911 is 64 files / 385 tests passing (recorded in Phase 21).
- **Two of the recon four claimed high/medium areas did not reproduce and are not filed.** The auth-context scoping reduced to L4-RS-02 at low severity. No cross-module invalidation defect exists.
- **Nothing was fixed.** No code changed.


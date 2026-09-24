# L5 - Web presentation review: components, pages, theme

**Date:** 2026-09-24 - **Baseline:** HEAD 8cae4c3 - **Layer:** L5 (Web presentation)
**Scope:** apps/web/src/components (89 files), apps/web/src/pages (14 files), apps/web/src/theme (1 file).
**Status:** ANALYSIS ONLY. Not authorised. This document files findings; it does not fix or schedule.

## 0. Method

**Verification legend:** observed (read at source this session) - inferred (derived from a measured count) - unverified-risk (reasoned, not measured).

**What was measured, not guessed.** File inventory and line counts were produced by enumerating the filesystem, not by trusting prior art. The 104-file count in INDEX.md:26 reproduces exactly; the recorded 21,641-line figure does **not** - see section 1.

**Two hypotheses were raised and then FALSIFIED by probe, and are recorded because they shaped the outcome:**

1. **HighlightText hooks-order crash - falsified.** The component returns early at HighlightText.tsx:14-16 before calling useMemo at :20. I predicted a React hooks-order crash when text goes from empty to non-empty on the same mounted instance. A probe rendering the empty-to-populated transition (both bare and behind an error boundary) threw nothing, logged nothing to console.error, and rendered the correct output. Downgraded to a latent-defect finding, not a proven crash. The probe file was deleted.
2. **Query-key invalidation mismatches - falsified.** Several invalidateQueries calls name keys that are never used as a queryKey. React Query matches by key PREFIX, and every one of these is either a correct prefix of a longer real key or a harmless no-op. Not a finding.

## 1. Inventory (measured)

| Area | Files | Lines |
|---|---|---|
| apps/web/src/components | 89 | 18,967 |
| apps/web/src/pages | 14 | 4,004 |
| apps/web/src/theme | 1 | 124 |
| **L5 total** | **104** | **23,095** |

**The file count reproduces INDEX.md:26 exactly (104). The line count does NOT.** INDEX.md:26 records 21,641; direct enumeration this session gives 23,095, a difference of 1,454 lines (+6.7%). Caveat: environment gotcha 8.6 records that line-counting methods disagree on this host, so the 23,095 figure carries that uncertainty. Either way, L5 is ~6-7% larger than the register states, and the register figure should be re-measured rather than trusted.

Test coverage exists and is substantial: 50 test files under apps/web/tests/unit, plus apps/web/src/lib/api-client.test.ts and apps/web/src/hooks/useLaneOrderPreference.test.ts.

**Suite baseline (measured this session):** 64 test files, **384 passed / 1 failed**. The single failure is tests/unit/district-state.test.tsx:54, the known pre-existing red test. This confirms the handoff's number and confirms it is the ONLY red test in the repo's web layer.

---

## 2. Findings

### L5-P01-01 - there is no linter anywhere in this repository

- **Path:** repo root (no eslintrc/eslint.config), apps/web/package.json:6-16 - **Severity:** `medium` - **Class:** `hidden-dependency` - **Verification:** `observed`
- **Evidence.** apps/web/package.json declares 9 scripts and no `lint` script; its devDependencies contain no `eslint`, no `eslint-plugin-react-hooks`, and no `eslint-plugin-react`. A recursive search for `.eslintrc*` and `eslint.config.*` across the whole repo (excluding node_modules) returns **zero** files. The root package.json declares scripts `build`, `typecheck`, `test`, `test:e2e`, db and vps helpers - and no lint step. No CI workflow invokes a linter.
- **Consequence.** This is the root cause of finding L5-P01-02 and of a whole class of defects that a standard React lint config would have caught mechanically. `eslint-plugin-react-hooks` would have flagged the rules-of-hooks violation at first commit. The absence is systemic, not local to L5: it means every layer reviewed so far was reviewed without this safety net, and defects of this shape can accumulate silently.
- **Why `medium`, not `high`.** It does not itself break behaviour, and `tsc --noEmit` plus 385 integration tests do provide real coverage. But it is the cheapest available structural improvement in the repo.
- **Fix direction.** Add ESLint with `eslint-plugin-react-hooks` and `typescript-eslint` at the root, wire a `lint` script, and add it to CI. Adopt as a warning-only gate first so existing violations surface without blocking.

### L5-P01-02 - HighlightText calls a hook after a conditional return

- **Path:** apps/web/src/components/topics/HighlightText.tsx:14-20 - **Severity:** `low` - **Class:** `correctness` (latent) - **Verification:** `observed`
- **Evidence.** The component returns early at :14-16:

      if (!text || typeof text !== 'string') {
        return <span style={style}>{text ?? ''}</span>;
      }

  and only then calls `useMemo` at :20. A hook therefore sits behind a conditional return, which is the canonical rules-of-hooks violation.
- **Consequence.** This is a latent defect, not a proven crash. **I hypothesised a hooks-order crash on an empty-to-populated text transition and FALSIFIED it by probe** - twice: once bare, once behind a React class error boundary. Neither threw, neither logged to `console.error`, and the second rendered the correct output. So the practical impact today is that the defect is invisible and untested, and it is exactly the shape `eslint-plugin-react-hooks` exists to catch. It is filed as `low` on that basis. It would be filed as a crash if a future refactor makes the hook count genuinely vary.
- **Call sites (reachable, three of them).** apps/web/src/components/topics/TopicSummaryBody.tsx:120, apps/web/src/components/topics/TopicLatestUpdateCallout.tsx:77, via apps/web/src/pages/TopicEvidencePage.tsx:300,309; apps/web/src/components/topics/TopicEvidenceDrawer.tsx:360,369; apps/web/src/components/topics/TopicCard.tsx:265,276. Note TopicSummaryBody.tsx:30 defines pending as `summary === null`, so an empty string is treated as ready-and-renderable - a state the contracts permit, since packages/api-contracts/src/topics.ts:53 types summary as `z.string().nullable()`.
- **Fix direction.** Move the early return below the `useMemo`, or convert the whole body to compute `parts` unconditionally. One-line move; test-first with the empty-to-populated transition.

### L5-P01-03 - the design system is only partially adopted: 458 hardcoded colours

- **Path:** apps/web/src/components + apps/web/src/pages (43 files) - **Severity:** `medium` - **Class:** `low-locality` - **Verification:** `observed`
- **Evidence (measured).** 458 six-digit hex colour literals across **43 of 103** component/page files, against a theme of 124 lines (apps/web/src/theme/antd-theme.ts). The design system exists and is genuinely used - `themeColors` appears 73 times in components - so this is inconsistent adoption, not a missing abstraction.
- **Illustrative instance.** apps/web/src/components/topics/TopicCard.tsx:152:
      backgroundColor: isPulseActive ? '#FFFBFB' : themeColors.colorBgLaneTrack,
  A raw literal and a theme token on the same line, for the same visual role.
- **Consequence.** Colours that bypass the token layer cannot be re-themed, are not covered by contrast guarantees, and drift silently as the palette evolves. The literal at TopicCard.tsx:152 (`#FFFBFB`, a pulse highlight) is a semantic state with no token, which suggests the palette is incomplete rather than only misused.
- **Fix direction.** Extend `antd-theme.ts` with the missing semantic tokens, then sweep the 458 literals in bounded batches (<=5 files per phase). Purely mechanical, no behaviour change.

---

## 3. What L5 found *clean* (recorded so it is not re-reviewed)

- **No XSS surface.** A grep for `dangerouslySetInnerHTML`, `innerHTML` and `__html` across `apps/web/src` returns **zero** matches. `HighlightText` renders its split parts as React children, and escapes regex metacharacters at :22 before constructing the `RegExp` at :23. For a layer that renders citizen-authored Telegram text, this is the right answer and is worth recording.
- **Accessibility is genuinely strong.** 114 ARIA matches (`aria-label`, `role`, `aria-live`) across the components. Live regions exist (LiveRegionAnnouncer.tsx:79-80), status roles are used for state badges (HealthStatusBadge.tsx:77, IssueSeverityBadge.tsx:62), and keyboard navigation is implemented in DateScopeSelect.tsx:196-200 and TopicEvidenceDrawer.tsx:146. Components without ARIA are decorative cards and icons that need none.
- **Query-key invalidation is correct.** Several `invalidateQueries` calls name keys that are never used as a `queryKey`, which looks like a mismatch. It is not: React Query matches by key **prefix**, so `['hokim-statistics', districtId]`, `['district-topics', districtId]` and `['hokim-board', districtId]` (SubscriptionsPage.tsx:150-152) correctly invalidate the longer real keys built at useTopicStatistics.ts:52-61. `['district-subscription', districtId]` (SubscriptionsPage.tsx:145, EditSubscriptionDrawer.tsx:97) is invalidated but never queried - a harmless no-op. **Filed as clean, not as a finding.**
- **The canonical query-key factory is used.** apps/web/src/district/query-keys.ts:5-13 is consumed consistently by the district hooks and pages. Four components hand-roll the literal `['districts', 'list']` (DistrictSelector.tsx:17, CreateManualSignalModal.tsx:33, SignalMonitoringTable.tsx:164, AuditFilterBar.tsx:70) instead of calling `districtQueryKeys.list()`, but the literal is byte-identical to what the factory returns (:7). A consistency nit, not a cache bug.
- **Date parsing is sound.** DateScopeSelect.tsx:25-74 constructs a `Date` and then re-validates with `getFullYear`/`getMonth`/`getDate` round-trips plus explicit range guards - the correct way to reject 31.02.2026.
- **The `Asia/Tashkent` invariant holds on the web side.** apps/web/src/lib/formatters.ts pins `timeZone: 'Asia/Tashkent'` in 8 functions and re-exports `getTashkentToday` from api-contracts rather than reimplementing it.
- **Type discipline is good.** Exactly **one** `as any` in all of components/pages (AnalysisSettingsActivationModal.tsx:144) across ~23K lines.
- **`key={index}` is benign.** It appears only at HighlightText.tsx:40,54, where the list is static and never reordered.
- **localStorage use is confined and non-sensitive.** district-context.tsx, useTopicReadState.tsx and useLaneOrderPreference.ts only; all guard on `typeof window`; no credentials or tokens stored.

---

## 4. Prior art correction

**INDEX.md:26 understates L5's size.** The file count (104) is right; the line count (21,641) does not reproduce - direct enumeration gives 23,095 (+1,454, +6.7%). Per environment gotcha 8.6 the counting method carries some uncertainty on this host, so the honest statement is: **the register figure should be re-measured, and L5 is larger than recorded.**

**INDEX.md's L4 note bears on L5.** INDEX.md:175 records that the L4 web-data sweep is incomplete (1 of 15 findings survived, only L4-P01-01) and calls completing it "a funding decision for the gate". L5 sits directly on top of L4's surface: components consume the `apps/web/src/{api,district,topics,hooks}` layer that L4 owns. **L5 findings that bottom out in a data-layer defect should be filed to L4, not double-counted here.**

---

## 5. Honest limitations

- **This is a targeted review, not an exhaustive one.** ~23K lines were swept by measured pattern searches plus close reads of the highest-risk files, not read line-by-line. The patterns searched were: XSS sinks, hooks-order violations, query-key consistency, theme-token bypass, `as any`, timezone handling, `localStorage`, and ARIA coverage. A different reviewer searching different patterns would find different things.
- **Two hypotheses were falsified and are recorded as such** (section 0). The falsification is the more valuable half of this document: it prevents the next session re-deriving a crash that does not exist, and it is the reason L5-P01-02 is `low` rather than `high`.
- **Nothing was fixed.** No code was changed by this review. The working tree carries only the uncommitted L6-P01-06 auto-resolve fix from earlier in this session.
- **No visual sign-off exists** for any L5 surface, and none is claimed. No browser automation was run.
- **One boundary case was seen and deliberately not filed.** The custom `useMemo` plus manual cursor-history pagination in SignalMonitoringTable.tsx:100-133 and useHokimTopicBoard.ts warrant a dedicated pass against the query layer; I did not establish whether the defect (if any) is L5-local or L4-owned, so filing it here would risk double-counting against an incomplete L4 sweep.
- **The register's L5 line count is corrected but not proven** - see section 4.


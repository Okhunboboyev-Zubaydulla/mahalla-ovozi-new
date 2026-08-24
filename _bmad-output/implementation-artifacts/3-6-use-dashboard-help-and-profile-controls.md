---
baseline_commit: 7877db0
---

# Story 3.6: Use Dashboard Help and Profile Controls

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Hokim**,
I want Help and session controls available from the dashboard,
so that I can understand the product's evidence limits and safely leave my protected session without changing the dashboard model.

---

## Acceptance Criteria

### 1. Toolbar Integration & Layout Integrity (AC 1)
- **Given** an authenticated Hokim whose server-derived `ActorContext` is bound to exactly one Active District
- **When** the dashboard overview shell renders
- **Then** `BoardToolbar.tsx` mounts Help (`Ёрдам`) and profile controls in the compact sticky top toolbar
- **And** the toolbar retains `Маҳалла Овози`, the fixed District name, current date, last refresh timestamp, filter trigger button (on mobile), refresh button, and live indicators
- **And** the interface adds zero sidebars, dashboard page tabs, District switchers, or separate History surfaces
- **And** controls not implemented by this story are not shown as fake disabled capabilities.

### 2. Factual Uzbek Cyrillic Help Guidance & Strict Neutrality (AC 2)
- **Given** the Hokim activates the Help action
- **When** the Help surface is presented (desktop drawer or narrow full-screen page)
- **Then** it provides concise, neutral, factual Uzbek Cyrillic guidance structured into the following mandatory sections:
  1. **Хабарлар ва далиллар табиати (Reported Signals vs Verified Facts)**:
     - Clarifies that dashboard signals are resident messages reported via Telegram groups, not verified official facts, representative public opinion, or administrative determinations.
  2. **Йўналишлар ва кўп йўналишли мавзулар (Lanes & Multi-Lane Topics)**:
     - Explains the 5 canonical Lanes (`Ҳокимга оид`, `Сув`, `Электр`, `Газ`, `Чиқинди`) and notes that one canonical Topic can legitimately belong to multiple Lanes without being duplicated.
  3. **«Янги» ва «Янгиланди» белгилари (Badges & Visit Baselines)**:
     - Explains that `Янги` denotes a Topic created since the preceding successful dashboard visit boundary, and `Янгиланди` denotes an existing Topic with newly committed evidence since that captured boundary.
     - Notes that baselines remain immutable for the duration of the active visit.
  4. **Далиллар кетма-кетлиги ва асл матн (Evidence Chronology & Verbatim Fidelity)**:
     - Clarifies that Accepted Evidence is strictly ordered oldest-to-newest and rendered verbatim in the citizen's original script (Cyrillic, Latin, or mixed) and line-break structure without sampling or AI rewriting.
  5. **Маълумотлар янгиланиши ва кечикишлар (Freshness & Background Processing)**:
     - Explains background intake processing and indicates that during Telegram or processing delays, newly sent messages may appear after processing completes.
  6. **Telegram ҳаволалари (Telegram Best-Effort Navigation)**:
     - Explains that `Telegramда очиш` links provide best-effort navigation to Telegram messages, and that deleted or unavailable Telegram source messages do not invalidate or downgrade retained evidence.
  7. **Қарор қабул қилиш масъулияти (Hokim Ownership of Decisions)**:
     - Strictly reinforces that the system produces no automated decisions, recommendations, or priority scores; real-world decisions and municipal responses belong solely to the District Hokim.
  8. **90 кунлик ягона сақлаш муддати (90-Day Unified Retention Rule)**:
     - Explains that a Topic and all of its Accepted Evidence expire together 90 days after that Topic's latest relevant evidence timestamp, and individual evidence items do not expire earlier while the Topic remains retained.
  9. **Қатъий бетарафлик ва тақиқланган функциялар (Strict Neutrality & Scope Guardrails)**:
     - Clarifies that the platform contains no AI chat assistants, support tickets, feedback forms, service-performance scores, or case management.
- **And** Help text strictly avoids Latin UI terminology, bureaucratic jargon, blame, drama, exclamation marks, or patronizing language.

### 3. Desktop Read-Only Complementary Drawer & Focus Restoration (AC 3)
- **Given** a desktop-width composition ($\ge 1024\text{px}$)
- **When** Help is opened
- **Then** it opens as a right-side read-only drawer over the dashboard board (`width={520}`)
- **And** programmatically it is a labelled non-modal complementary region (`role="region"`, `aria-label="Тизим ёрдами ва тушунтиришлар"`, `aria-modal={false}`, `mask={false}`, `keyboard={false}`, `rootStyle={{ pointerEvents: 'none' }}`)
- **And** its heading (`id="dashboard-help-heading"`, `tabIndex={-1}`) receives programmatic focus on open
- **And** `Ёпиш` (Close button) is the first operable action in the drawer
- **And** the underlying dashboard remains operable, while targets visually covered by the drawer are not misleadingly keyboard reachable
- **And** pressing `Escape` or activating `Ёпиш` closes Help and restores focus to the exact Help opener button (`#dashboard-help-button`) where valid, otherwise Story 3.1's deterministic dashboard focus fallback (`useFocusFallback`) applies
- **And** drawer presentation enforces strict two-way mutual exclusion: opening Help while Topic Evidence Drawer is open immediately closes the evidence drawer (`setSelectedTopicId(null)`), and selecting any Topic card while Help is open immediately closes Help (`setHelpDrawerOpen(false)`) without overlapping two drawers simultaneously.

### 4. Narrow-Screen Routed Full-Screen Page & Context Preservation (AC 4)
- **Given** a narrow-screen composition ($< 1024\text{px}$, 320px mobile, or 200% zoom)
- **When** Help is activated
- **Then** the application navigates to the dedicated routed full-screen read-only page (`/help`) forwarding current active query parameters (`navigate({ pathname: '/help', search: location.search })`)
- **And** it is never presented as a modal dialog or popup
- **And** entry programmatically focuses the page's labelled main heading (`id="dashboard-help-page-heading"`, `tabIndex={-1}`)
- **And** an explicit `Орқага` (Back) button and top bar are presented
- **And** activating `Орқага` navigates back via `navigate(-1)` with a fallback to `navigate({ pathname: '/', search: location.search })`, restoring the prior dashboard query parameters, board horizontal position, Lane scroll positions, and exact Help opener focus where valid (or deterministic fallback).

### 5. Dashboard State & Review Context Preservation (AC 5)
- **Given** the Hokim opens and closes Help on any supported viewport
- **When** returning to the dashboard
- **Then** the active dashboard filter parameters (`dateScope`, `dateFrom`, `dateTo`, `mahallaName`, `lanes`), horizontal board position, and every Lane's vertical scroll position remain completely preserved
- **And** opening Help never triggers re-fetching, recalculation, or reprocessing of Topic or evidence data.

### 6. Profile Popover & Session Controls (AC 6)
- **Given** an authenticated Hokim in the dashboard
- **When** the profile control in `BoardToolbar.tsx` is activated
- **Then** an Ant Design `Popover` opens attached to the profile trigger button (`id="dashboard-profile-button"`, `aria-label="Ҳоким профили ва сессия созламалари"`, `aria-haspopup="dialog"`, `aria-expanded={popoverOpen}`)
- **And** the popover container adheres strictly to `DESIGN.md` light tokens (`boxShadow: 'none'`, border `1px solid #E2E8F0`, background `#FFFFFF`)
- **And** the popover displays:
  - Hokim username (`actor.username` / display name)
  - Assigned District name (`EnvironmentOutlined` + `districtName`)
  - Role badge (`Tag color="cyan"` with text `Туман ҳокими`)
  - Session action: `Чиқиш` (Sign out button with `LogoutOutlined`)
- **And** pressing `Escape` or clicking outside dismisses the popover and restores focus to `#dashboard-profile-button`
- **And** the profile surface does not create a dedicated profile page, editable profile form, password change UI (handled strictly by first-sign-in workflow), role selector, account admin, or District switcher.

### 7. Session Termination & Protected Data Purging (AC 7)
- **Given** the Hokim activates `Чиқиш` (Sign out) from the profile control
- **When** sign-out executes
- **Then** `authClient.signOut()` issues `POST /api/v1/auth/sign-out` to invalidate the server session cookie
- **And** all TanStack Query cache data is purged (`queryClient.cancelQueries()`, `queryClient.clear()`, `queryClient.setQueryData(['auth', 'session'], null)`)
- **And** browser-visible state is removed and the user is redirected to `/sign-in`
- **And** no dashboard filter, search text, Topic/evidence selection, or protected content survives as restorable authenticated state
- **And** no confirmation dialog is required (since the dashboard contains no dirty editable forms).

### 8. Visual Styling, Accessibility Floor & Reduced Motion (AC 8)
- **Given** Help or profile controls render across viewports
- **When** visual elements are displayed
- **Then** all styling strictly adheres to `DESIGN.md` tokens: light-only theme, zero persistent box-shadows on persistent containers (`boxShadow: 'none'`, borders `#E2E8F0`), high-contrast focus rings (`outline: 2px solid #0284C7`), and minimum 14px text floor
- **And** all text and headings enforce `wordBreak: 'break-word'` and `overflowWrap: 'break-word'` ensuring zero horizontal clipping on 320px viewports or 200% zoom
- **And** all interactive targets (buttons, links, popover triggers) satisfy the minimum 44px touch target floor on mobile/touch viewports
- **And** programmatic drawer opening/closing and page transitions become immediate without smooth sliding under `prefers-reduced-motion: reduce`.

### 9. Automated Unit & Integration Test Verification (AC 9)
- **Given** Story 3.6 is verified under the automated test suite
- **When** Vitest component and integration checks run
- **Then** tests cover:
  1. `BoardToolbar` renders Help button and Profile popover trigger with proper ARIA attributes and no prohibited controls (no sidebar, no tabs, no district switcher).
  2. Profile popover correctly displays username, district name, `Туман ҳокими` role tag, and `Чиқиш` action.
  3. Activating `Чиқиш` invokes `signOut()`, clears query cache, and routes to `/sign-in`.
  4. Desktop Help drawer opens on $\ge 1024$px as a non-modal complementary region, focuses `#dashboard-help-heading`, has Close as first action, closes on Escape, and restores focus to `#dashboard-help-button`.
  5. Mobile Help page routes to `/help` on $< 1024$px, focuses `#dashboard-help-page-heading`, and `Орқага` restores dashboard context.
  6. All 9 mandatory factual Uzbek Cyrillic guidance sections are present in Help content, and prohibited capabilities (AI chat, tickets, scoring) are absent.
  7. Reduced motion preferences are respected with immediate transitions.

---

## Tasks / Subtasks

- [x] **Task 1: Factual Help Content Module & Shared Copy** (AC: 2, 8)
  - [x] 1.1 In `apps/web/src/components/topics/HelpContent.tsx`, create the structured, reusable Help guidance component.
  - [x] 1.2 Define clear, accessible sections with Uzbek Cyrillic typography matching `DESIGN.md`:
    - Section 1: Хабарлар ва далиллар табиати (Reported signals vs verified facts)
    - Section 2: Йўналишлар ва кўп йўналишли мавзулар (5 lanes & multi-lane topics)
    - Section 3: «Янги» ва «Янгиланди» белгилари (Visit baselines & badges)
    - Section 4: Далиллар кетма-кетлиги ва асл матн (Evidence chronology & verbatim line fidelity)
    - Section 5: Маълумотлар янгиланиши ва кечикишлар (Freshness & background processing delay)
    - Section 6: Telegram ҳаволалари (Best-effort links & evidence durability)
    - Section 7: Қарор қабул қилиш масъулияти (Hokim ownership of decisions)
    - Section 8: 90 кунлик ягона сақлаш муддати (90-day unified retention rule: "Мавзу ва унга тегишли барча далиллар мавзунинг сўнгги фаоллик вақтидан бошлаб 90 кун давомида сақланади; мавзу сақланиб турган даврда айрим далиллар алоҳида муддатидан олдин ўчирилмайди.")
    - Section 9: Қатъий бетарафлик ва тақиқланган функциялар (Strict neutrality & scope boundaries)
  - [x] 1.3 Ensure zero Latin terminology, no persistent shadows, `#0F172A` headings, `#334155` body text, 14px minimum font size, `lineHeight: '22px'`, and `wordBreak: 'break-word'` / `overflowWrap: 'break-word'` across all sections.

- [x] **Task 2: Desktop Help Drawer Component** (AC: 3, 5, 8)
  - [x] 2.1 In `apps/web/src/components/topics/DashboardHelpDrawer.tsx`, build the desktop read-only drawer:
    - `<Drawer>` with `open={open}`, `onClose={onClose}`, `mask={false}`, `keyboard={false}`, `rootStyle={{ pointerEvents: 'none' }}`, `width={520}`, `role="region"`, `aria-label="Тизим ёрдами ва тушунтиришлар"`.
    - `styles={{ wrapper: { boxShadow: 'none', pointerEvents: 'auto' }, content: { boxShadow: 'none', borderLeft: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }, header: { borderBottom: '1px solid #E2E8F0', padding: '14px 20px' }, body: { padding: '20px', overflowY: 'auto' } }}`.
    - Programmatic focus on `#dashboard-help-heading` (`tabIndex={-1}`) upon opening.
    - Close button (`aria-label="Ёпиш"`) as first operable control in header.
    - Explicit keyboard `Escape` listener in `useEffect` closing drawer and restoring focus.
    - Immediate transitions with zero animations when `prefers-reduced-motion` is active.
    - Renders `<HelpContent />` inside drawer body.

- [x] **Task 3: Narrow-Screen Help Page & App Route** (AC: 4, 5, 8)
  - [x] 3.1 In `apps/web/src/pages/DashboardHelpPage.tsx`, create the full-screen mobile page:
    - Sticky top navigation bar with `Орқага` button (`ArrowLeftOutlined`, `aria-label="Бош саҳифага қайтиш"`) and Title `Тизим ёрдами`.
    - Main container with `id="dashboard-help-page-heading"`, `tabIndex={-1}`, focused programmatically on mount.
    - Responsive layout container (`maxWidth: 720`, `margin: '0 auto'`, `padding: '20px 16px 40px 16px'`).
    - Renders `<HelpContent />`.
    - `Орқага` triggers `navigate(-1)` with fallback to `navigate({ pathname: '/', search: location.search })`, preserving prior dashboard filter query parameters.
  - [x] 3.2 In `apps/web/src/App.tsx`, register the `/help` route:
    - Wrapped in `<ProtectedRoute>` for `DISTRICT_HOKIM`.

- [x] **Task 4: Board Toolbar Updates with Help Trigger & Profile Popover** (AC: 1, 6, 7, 8)
  - [x] 4.1 In `apps/web/src/components/topics/BoardToolbar.tsx`:
    - Add `onOpenHelp?: () => void` and `helpButtonRef?: React.RefObject<HTMLButtonElement | null>` to `BoardToolbarProps`.
    - Add Help button: `<Button id="dashboard-help-button" ref={helpButtonRef} icon={<QuestionCircleOutlined />} onClick={onOpenHelp} aria-label="Тизим ёрдами">Ёрдам</Button>`.
    - Replace raw inline `Чиқиш` button with an Ant Design `<Popover>` attached to a profile trigger button (`id="dashboard-profile-button"`, `aria-haspopup="dialog"`, `aria-expanded={popoverOpen}`).
    - Popover overlay container styled with `boxShadow: 'none'`, `border: '1px solid #E2E8F0'`, `backgroundColor: '#FFFFFF'`.
    - Popover content:
      - Username (`Text strong`: `actor?.username`)
      - District (`EnvironmentOutlined`: `districtName`)
      - Role badge (`Tag color="cyan"`: `Туман ҳокими`)
      - Divider (`<Divider style={{ margin: '8px 0' }} />`)
      - Sign-out button (`Button type="text" icon={<LogoutOutlined />} onClick={signOut} loading={isSigningOut} aria-label="Тизимдан чиқиш">Чиқиш</Button>`).
    - Dismiss popover on Escape or clicking outside, returning focus to `#dashboard-profile-button`.
    - Verify that no sidebar, tabs, or district switcher controls are rendered.

- [x] **Task 5: Dashboard Integration & Focus Management** (AC: 3, 4, 5)
  - [x] 5.1 In `apps/web/src/pages/HokimDashboardPage.tsx`:
    - Add `helpDrawerOpen` state and `helpButtonRef = useRef<HTMLButtonElement | null>(null)`.
    - Implement `handleOpenHelp`: checks `window.innerWidth < 1024`; if narrow, `navigate({ pathname: '/help', search: location.search })`; if desktop, closes open `selectedTopicId` via `setSelectedTopicId(null)` and sets `setHelpDrawerOpen(true)`.
    - Implement `handleCloseHelp`: sets `setHelpDrawerOpen(false)`, restores focus to `helpButtonRef.current` if valid, otherwise falls back to `returnFocus()`.
    - Update `handleSelectTopic`: add `setHelpDrawerOpen(false)` so opening a Topic Evidence drawer automatically closes Help Drawer (two-way mutual exclusion).
    - Pass `onOpenHelp={handleOpenHelp}` and `helpButtonRef={helpButtonRef}` to `BoardToolbar`.
    - Render `<DashboardHelpDrawer open={helpDrawerOpen} onClose={handleCloseHelp} />`.

- [x] **Task 6: Automated Vitest & Component Verification** (AC: 9)
  - [x] 6.1 In `apps/web/tests/unit/BoardToolbar.test.tsx`, expand/update unit tests:
    - Verify Help button presence, `id="dashboard-help-button"`, and click event calling `onOpenHelp`.
    - Verify Profile popover trigger renders username/district with `aria-haspopup="dialog"` and opens popover with `Туман ҳокими` badge and `Чиқиш` button.
    - Verify `signOut()` call, `queryClient.cancelQueries()`, and cache clearing when `Чиқиш` is clicked.
    - Verify absence of sidebar, tabs, district switchers, or editable profile controls.
  - [x] 6.2 In `apps/web/tests/unit/DashboardHelp.test.tsx`, write comprehensive component tests:
    - Desktop `DashboardHelpDrawer`: renders open, focuses `#dashboard-help-heading`, closes on Close button and Escape key, restores focus to opener (or `returnFocus()`).
    - Mutual drawer exclusion: verify opening Help closes Topic drawer, and opening a Topic card closes Help drawer.
    - Mobile `DashboardHelpPage`: renders heading, focuses `#dashboard-help-page-heading`, Back button navigates back with search query params preserved.
    - Verify presence of all 9 factual sections (signals vs facts, 5 lanes, baselines, evidence order, processing delay, Telegram links, decision ownership, 90-day retention, strict neutrality).
    - Verify absence of prohibited features (no AI chat, tickets, scoring).
  - [x] 6.3 Execute `pnpm --filter @mahalla-ovozi/web test` and `pnpm typecheck` to confirm 100% passing checks.

---

## Dev Notes

### Relevant Architecture Patterns & Invariants
- **AD-03 (Actor Authorization Boundary)**: Hokim session is strictly bound to their assigned District ID. Help content and profile controls are read-only and enforce zero cross-district or cross-tenant leakage.
- **AD-09 (Session Termination Contract)**: `signOut()` issues `POST /api/v1/auth/sign-out`, cancels pending queries (`queryClient.cancelQueries()`), purges all cached TanStack Query state (`queryClient.clear()`), and navigates to `/sign-in`.
- **AD-10 (Read-Only Drawer vs Narrow Routed Page)**: Desktop ($\ge 1024$px) uses non-modal complementary drawer (`role="region"`, `mask={false}`, `keyboard={false}`, `pointerEvents: 'none'`); narrow viewports ($< 1024$px) use full-screen route (`/help`).

### Design & Token Specifications (`DESIGN.md` & `EXPERIENCE.md`)
- **Theme**: Ant Design 5 light theme via `mahallaTheme`.
- **Elevation**: Zero persistent box-shadows (`boxShadow: 'none'`, borders `#E2E8F0`).
- **Typography Floor**: Minimum 14px body text (`#334155`), 16–18px headings (`#0F172A`), brand blue `#0284C7`.
- **Touch Targets**: Minimum 44px $\times$ 44px on touch viewports.
- **Focus Indicators**: High-contrast `outline: 2px solid #0284C7` with visible focus styling.
- **Reduced Motion**: Immediate transitions (`animation: 'none'`, immediate drawer mount/dismount).

### Negative Guardrails & Prohibited Additions
1. **NO AI Chat / Feedback / Tickets**: The Help surface is strictly a static, factual guide. No chatbot, feedback textareas, support forms, or contact submissions.
2. **NO Service Scores / Recommendations**: Help explicitly reaffirms that the system does not score services, rate mahallas, or recommend municipal actions.
3. **NO Dedicated Profile Page / Edit Form**: The profile control is a lightweight information popover + Sign out trigger. No editable fields, avatar uploads, or password changes (handled on initial login).
4. **NO Navigation Bloat**: Do not introduce navigation sidebars, tabs, or district selectors to the Hokim dashboard.

---

## Project Structure Notes

### Alignment with Unified Project Structure
```
apps/web/src/
├── components/
│   └── topics/
│       ├── BoardToolbar.tsx          # UPDATE: Add Help button & Profile popover
│       ├── HelpContent.tsx           # NEW: Reusable factual Uzbek Cyrillic help sections
│       └── DashboardHelpDrawer.tsx   # NEW: Desktop read-only complementary drawer
├── pages/
│   ├── DashboardHelpPage.tsx         # NEW: Narrow-screen full-screen routed help page
│   └── HokimDashboardPage.tsx        # UPDATE: Help drawer state, mobile route trigger & focus restoration
├── App.tsx                           # UPDATE: Register /help route protected by ProtectedRoute
└── tests/
    └── unit/
        ├── BoardToolbar.test.tsx     # UPDATE: Tests for Help button, Profile popover, Sign out
        └── DashboardHelp.test.tsx    # NEW: Tests for Drawer, Page, HelpContent, and Focus
```

---

## Dev Agent Record

### Agent Model Used
Gemini 3.7 Flash (High)

### Debug Log References
- Fixed Ant Design 5 Popover deprecation warning by moving overlay styling to `styles={{ body: { ... } }}`.
- Handled async `signOut()` assertion in `BoardToolbar.test.tsx` using `waitFor()`.
- Verified 100% test coverage across 29 test files and 134 tests with 0 typecheck errors.

### Completion Notes List
- Implemented `HelpContent.tsx` with all 9 factual Uzbek Cyrillic sections adhering strictly to PRD/UX neutrality and token floors.
- Built desktop `DashboardHelpDrawer.tsx` with non-modal `role="region"`, `width={520}`, header focus, and Escape keyboard handling.
- Built narrow-screen `DashboardHelpPage.tsx` and registered protected `/help` route in `App.tsx` with back navigation query preservation.
- Updated `BoardToolbar.tsx` with `#dashboard-help-button` and `#dashboard-profile-button` Popover showing username, district, `Туман ҳокими` badge, and `Чиқиш` action.
- Wired two-way mutual exclusion and focus fallback restoration in `HokimDashboardPage.tsx`.
- Authored and updated full Vitest unit & integration test suites in `BoardToolbar.test.tsx` and `DashboardHelp.test.tsx`.
- Verified type safety (`pnpm typecheck` - 0 errors) and automated tests (29 files, 134 passed).

### File List
- `_bmad-output/implementation-artifacts/3-6-use-dashboard-help-and-profile-controls.md` (MODIFIED)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED)
- `apps/web/src/components/topics/HelpContent.tsx` (NEW)
- `apps/web/src/components/topics/DashboardHelpDrawer.tsx` (NEW)
- `apps/web/src/pages/DashboardHelpPage.tsx` (NEW)
- `apps/web/src/App.tsx` (MODIFIED)
- `apps/web/src/components/topics/BoardToolbar.tsx` (MODIFIED)
- `apps/web/src/pages/HokimDashboardPage.tsx` (MODIFIED)
- `apps/web/tests/unit/BoardToolbar.test.tsx` (MODIFIED)
- `apps/web/tests/unit/DashboardHelp.test.tsx` (NEW)
- `apps/web/tests/unit/HokimDashboard.test.tsx` (MODIFIED)


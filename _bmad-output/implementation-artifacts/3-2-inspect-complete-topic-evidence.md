---
baseline_commit: a6f7da7
---

# Story 3.2: Inspect Complete Topic Evidence

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Hokim**,
I want to inspect the complete retained Accepted Evidence for a Topic,
so that I can understand exactly what residents reported without treating the Topic summary as the source of truth.

---

## Acceptance Criteria

### 1. Fixed-District Authentication & Topic Scope Isolation (AC 1)
- **Given** an authenticated Hokim whose server-derived `ActorContext` is bound to exactly one Active District
- **When** the Hokim requests evidence detail for a Topic (`GET /api/v1/hokim/topics/:id/evidence`)
- **Then** the server verifies that the Topic belongs strictly to the authenticated Hokim's fixed District (`topic.district_id === req.actor.districtId`) and has `status = 'ACTIVE'`
- **And** browser District state is never authorization evidence
- **And** any attempt to query a Topic from another District or a non-existent Topic returns a sanitized HTTP 404 / 403 error without leaking Topic existence or resident data
- **And** the detail reads retained source-of-truth `AcceptedEvidence` and `topic_projections` without rerunning AI relevance, Topic assignment, AI derivation, or intake processing.

### 2. Chronological Complete Evidence Ordering & Line Fidelity (AC 2)
- **Given** retained Accepted Evidence exists for the Topic
- **When** evidence detail loads
- **Then** every retained `AcceptedEvidence` item for that canonical Topic is returned ordered oldest-to-newest (`originalTimestamp ASC, telegramMessageId ASC, id ASC`)
- **And** original text or media caption is presented verbatim in its original script (Uzbek Cyrillic, Latin, Russian, or mixed) and exact line-break structure
- **And** no evidence is sampled, summarized away, or omitted merely because the Topic has many retained evidence items.

### 3. Progressive Oldest-to-Newest Continuation & Scoped Retry (AC 3)
- **Given** a retained Topic has more Accepted Evidence than can reasonably be returned in the initial response (e.g. $> 50$ items)
- **When** evidence detail opens
- **Then** the labelled Topic detail surface and its first chronological evidence batch become usable within the approved one-second target where retained data is available
- **And** additional retained Accepted Evidence loads progressively using deterministic oldest-to-newest keyset continuation (`cursor = base64url({ t: timestamp, msgId: messageId, id: evidenceId })`) via explicit `Яна кўрсатиш` action
- **And** progressive loading eventually exposes every retained Accepted Evidence item for that canonical Topic without sampling, summarizing, omission, duplication, or reordering
- **And** evidence continuation is local to the open Topic detail and does not replace or reset the dashboard board
- **And** if a progressive batch fails to load, already loaded evidence remains visible with a scoped `Юклаб бўлмади. Қайта уриниш.` action, and the Topic is not falsely presented as having a complete evidence set until all retained evidence has successfully loaded.

### 4. Asia/Tashkent Telegram Timestamp Presentation (AC 4)
- **Given** an Accepted Evidence item is displayed
- **When** its original Telegram timestamp is presented
- **Then** the timestamp is interpreted and displayed strictly in `Asia/Tashkent`
- **And** the calendar date uses `DD.MM.YYYY`, ordinary time uses 24-hour `HH:mm`, and when shown together the presentation follows `DD.MM.YYYY HH:mm`
- **And** browser locale, browser timezone, intake processing delay, retry time, or AI completion time cannot alter the preserved Telegram event time.

### 5. Privacy Compliance & Sender Attribution (AC 5)
- **Given** source identity is displayed for an evidence item
- **When** a Telegram username is retained and permitted in `user_metadata`
- **Then** the username is shown (e.g. `@username`)
- **And** otherwise the retained Telegram display name (`firstName` + `lastName` or `firstName`) is shown
- **And** absolute negative guardrail: zero citizen phone numbers, private Telegram user IDs (`telegramUserId`), or sensitive contact info are displayed, inferred, searched, reconstructed, or leaked through API payloads.

### 6. Safe Best-Effort Telegram Navigation (AC 6)
- **Given** an Accepted Evidence item has sufficient retained Telegram addressing metadata for best-effort navigation
- **When** the Hokim activates `Telegramда очиш`
- **Then** the product opens the resolved Telegram message URL (`https://t.me/${username}/${messageId}` for public groups or `https://t.me/c/${chatIdWithoutPrefix}/${messageId}` for private supergroups) in a new browser tab with `target="_blank" rel="noopener noreferrer"`
- **And** failure to open Telegram does not invalidate, hide, delete, or downgrade the retained dashboard evidence
- **And** the UI does not claim that the source message still exists in Telegram
- **And** when an Accepted Evidence item lacks permitted addressing metadata, `Telegramда очиш` is not presented, the evidence remains fully readable as retained source-of-truth evidence, and the UI does not imply that absence of a link weakens the evidence.

### 7. Desktop Non-Modal Complementary Drawer & In-Place Switching (AC 7)
- **Given** a desktop-width dashboard ($\ge 1024\text{px}$)
- **When** evidence detail opens
- **Then** it opens as the approved right-side read-only evidence drawer over the dashboard board rather than replacing the dashboard or compressing the five-Lane board into a different layout
- **And** programmatically it is a labelled non-modal complementary region (`role="region"`, `aria-label="Мавзу далиллари"`) rather than a modal dialog
- **And** its heading receives programmatic focus on open, Close is the first detail action, and the originating Topic card reflects selected state (`outline: 2px solid #0284C7`)
- **And** the underlying dashboard remains operable (`mask={false}`, `rootStyle={{ pointerEvents: 'none' }}`) while targets covered by the drawer are temporarily removed from keyboard navigation (`tabIndex={-1}`)
- **And** board horizontal position and every Lane's vertical scroll position are preserved
- **And** when evidence detail for Topic A is open and the Hokim activates Topic B from the dashboard, the existing drawer surface is reused in-place: Topic A evidence is immediately cleared/skeletonized (no `keepPreviousData` ghost cache), Topic B context and evidence render, focus moves deterministically to Topic B detail heading, and later Close/Escape restores focus to the Topic B opener card
- **And** if Topic B fails to load after being selected in-place, the reused drawer surface presents a scoped Topic B failure state (`Юклашда хатолик. Қайта уриниш.`), Topic A's evidence is permanently discarded rather than resurrected, focus remains on the perceivable error panel, and Close/Escape restores focus to the Topic B opener card.

### 8. Narrow-Screen Routed Full-Screen View & Deterministic Focus Fallback (AC 8)
- **Given** a narrow-screen composition ($< 1024\text{px}$, 320px mobile, or 200% zoom)
- **When** read-only evidence detail opens
- **Then** it becomes the approved routed full-screen read-only page (`/topics/:id/evidence`) and is never presented as a modal dialog
- **And** the route contains only the minimum opaque Topic identifier (`id`) without sensitive summaries, resident content, or search queries in the URL path/query/fragment
- **And** returning to the dashboard via Back or Close restores the prior review context, filters, and exact opener card where valid
- **And** when the detail closes and the exact originating Topic card opener no longer exists or is no longer rendered, focus moves deterministically via `useFocusFallback.ts` to the originating Lane's fixed header (`lane-header-${lane}`) or the dashboard main heading (`dashboard-main-heading`).

### 9. Visual Styling & Accessibility Floor (AC 9)
- **Given** evidence detail and evidence items render
- **When** the visual composition is presented
- **Then** it complies with `DESIGN.md` tokens: light-only theme, zero persistent box-shadows (borders `#E2E8F0` and card background `#FFFFFF` only, drawer section `boxShadow: 'none'`), minimum 14px text floor, and high-contrast focus indicators (`outline: 2px solid #0284C7`)
- **And** the Topic's anchor evidence item is visually distinguished with an `Асосий далил` badge and accent border (`#0284C7`) in-situ without disrupting chronological oldest-to-newest reading order
- **And** programmatic drawer opening/closing and scrolling transitions become immediate under `prefers-reduced-motion: reduce`.

---

## Tasks / Subtasks

- [x] **Task 1: Shared API Contracts & Backend Evidence Query Service** (AC: 1, 2, 3, 4, 5, 6)
  - [x] 1.1 In `packages/api-contracts/src/topics.ts`, define and export:
    - `TopicEvidenceItemSchema`: `id`: `z.string()`, `topicId`: `z.string()`, `verbatimText`: `z.string()`, `contentType`: `z.string()`, `originalTimestamp`: `z.string().datetime()`, `formattedTime`: `z.string()`, `authorName`: `z.string().nullable()`, `authorUsername`: `z.string().nullable()`, `isAnchor`: `z.boolean()`, `telegramDeepLink`: `z.string().nullable()`.
    - `TopicEvidenceResponseSchema`: `topic`: `TopicCardItemSchema`, `anchorQuote`: `z.string()`, `anchorEvidenceId`: `z.string()`, `evidence`: `z.array(TopicEvidenceItemSchema)`, `totalCount`: `z.number().int().min(0)`, `nextCursor`: `z.string().nullable()`, `hasNextPage`: `z.boolean()`.
    - `TopicEvidenceQuerySchema`: `cursor`: `z.string().optional()`, `limit`: `z.coerce.number().int().min(1).max(100).default(50)`.
    - Export associated input and output TypeScript types (`TopicEvidenceQuery`, `TopicEvidenceQueryOutput`, `TopicEvidenceItem`, `TopicEvidenceResponse`).
  - [x] 1.2 In `apps/backend/src/modules/topics/topic-evidence-service.ts`, implement `TopicEvidenceService`:
    - `getTopicEvidence(actorContext, topicId, query)`:
      - Validates topic exists, has `status = 'ACTIVE'`, and `districtId === actorContext.districtId`.
      - Joins `topics`, `topic_projections`, `accepted_evidence`, and `district_telegram_groups`.
      - Orders evidence items chronologically: `ORDER BY ae.original_timestamp ASC, ae.telegram_message_id ASC, ae.id ASC`.
      - Applies keyset pagination with cursor `base64url({ t: timestamp, msgId: messageId, id: evidenceId })` with NaN date guard: `WHERE (ae.original_timestamp, ae.telegram_message_id, ae.id) > (${cursorDate}, ${cursor.msgId}, ${cursor.id})`.
      - Resolves `telegramDeepLink` via deterministic 3-tier algorithm:
        1. If `district_telegram_groups.telegram_chat_username` is non-empty: `https://t.me/${username}/${messageId}`.
        2. Else if `telegram_chat_id` starts with `-100`: `https://t.me/c/${chatId.slice(4)}/${messageId}`.
        3. Otherwise: return `null` (safely omit Telegram button).
      - Sanitizes sender attribution: extracts `authorUsername: user_metadata?.username ? '@' + username : null`, `authorName: (firstName || lastName) ? [firstName, lastName].filter(Boolean).join(' ') : null`, strictly excludes `telegramUserId` and phone numbers.
      - Formats `formattedTime` in `Asia/Tashkent` (`DD.MM.YYYY HH:mm`).
  - [x] 1.3 In `apps/backend/src/modules/topics/hokim-topics-routes.ts`, register `GET /api/v1/hokim/topics/:id/evidence`:
    - Protected by `verifyStateChangingOrigin` and `createRequireHokim(db)`.
    - Validates query params via `TopicEvidenceQuerySchema`.
    - Returns HTTP 200 with `TopicEvidenceResponseSchema`, HTTP 400 on invalid cursor/params, HTTP 404 on non-existent or cross-district topic.
  - [x] 1.4 In `apps/backend/tests/topic-evidence.test.ts`, write integration tests against isolated test DB `mahalla_ovozi_test`:
    - Fixed-district isolation (cross-district topic access denied with 404).
    - Chronological oldest-to-newest ordering with multi-batch pagination.
    - Keyset pagination with cursor continuation for $> 50$ items.
    - Privacy sanitization (zero phone numbers or private IDs in payload).
    - Best-effort Telegram deep link generation (public group, supergroup `-100`, and null fallback).

- [x] **Task 2: Frontend Client & State Management Hook** (AC: 1, 3, 7, 8)
  - [x] 2.1 In `apps/web/src/topics/hokim-topics-client.ts`, add `fetchTopicEvidence(topicId: string, query?: TopicEvidenceQuery, signal?: AbortSignal)`.
  - [x] 2.2 In `apps/web/src/topics/useTopicEvidence.ts`, implement TanStack Query v5 `useInfiniteQuery` hook:
    - Query key: `['topic-evidence', districtId, topicId]`.
    - `initialPageParam: undefined` (TanStack Query v5 requirement).
    - `getNextPageParam: (lastPage) => lastPage.hasNextPage && lastPage.nextCursor ? lastPage.nextCursor : undefined`.
    - `placeholderData: undefined` (strictly omit `keepPreviousData` to prevent ghost evidence cache during topic switching).
    - Exposes `topic`, `anchorQuote`, `anchorEvidenceId`, `evidenceList`, `totalCount`, `isLoading`, `isFetchingNextPage`, `isFetchNextPageError`, `hasNextPage`, `fetchNextPage`, `error`, `refetch`.
  - [x] 2.3 Write hook unit tests in `apps/web/tests/unit/useTopicEvidence.test.tsx` verifying cache invalidation, key switching without cross-topic bleeding, pagination appending, and `fetchNextPage()` scoped retry.

- [x] **Task 3: Desktop Drawer, Timeline & Evidence Presentation Components** (AC: 2, 4, 5, 6, 7, 9)
  - [x] 3.1 In `apps/web/src/components/topics/EvidenceItem.tsx`, build message card:
    - Sender name / username tag (e.g. `@username` or `Aziz Karimov`, fallback `'Фуқаро'`).
    - Formatted timestamp in `Asia/Tashkent` (`DD.MM.YYYY HH:mm`).
    - Verbatim message text/caption with `whiteSpace: 'pre-wrap'` line structure preservation.
    - Anchor quote visual indicator (`Асосий далил` tag + `#0284C7` accent border in-situ).
    - `Telegramда очиш` button with `target="_blank" rel="noopener noreferrer"` when `telegramDeepLink` is non-null.
    - Zero persistent box-shadows (`border: 1px solid #E2E8F0`, background `#FFFFFF`).
  - [x] 3.2 In `apps/web/src/components/topics/EvidenceTimeline.tsx`, build chronological list:
    - Renders evidence items oldest-to-newest.
    - `Яна кўрсатиш` button for progressive loading with loading spinner.
    - Local scoped retry banner (`Юклаб бўлмади. Қайта уриниш.` via `fetchNextPage()`) if continuation fails.
  - [x] 3.3 In `apps/web/src/components/topics/TopicEvidenceDrawer.tsx`, build desktop drawer:
    - Configured Ant Design v5 `<Drawer>` with `mask={false}`, `rootStyle={{ pointerEvents: 'none' }}`, `width={520}`, `role="region"`, `aria-label="Мавзу далиллари"`.
    - `styles={{ content: { boxShadow: 'none', borderLeft: '1px solid #E2E8F0' }, wrapper: { boxShadow: 'none' } }}` complying with `DESIGN.md`.
    - Close button as first operable control (`aria-label="Ёпиш"`).
    - Programmatic focus on drawer heading (`id="topic-evidence-heading"`, `tabIndex={-1}`) upon open or in-place topic switch.
    - Topic header containing summary, Mahalla, lane tags, activity time, anchor quote, and total evidence count.
    - In-place switching from Topic A to Topic B: shows skeleton during fetch, scoped failure state on error, and restores focus to opener on Close/Escape.
    - Keyboard Escape handler returning focus to originating Topic card.
  - [x] 3.4 In `apps/web/src/components/topics/TopicCard.tsx`, add `isSelected` prop to apply active border outline (`outline: 2px solid #0284C7`) when topic is currently open in drawer.

- [x] **Task 4: Responsive Full-Screen Routing, Accessibility Focus Fallback & End-to-End Verification** (AC: 7, 8, 9)
  - [x] 4.1 In `apps/web/src/pages/TopicEvidencePage.tsx`, build responsive full-screen page for narrow viewports ($< 1024\text{px}$) with Back navigation returning to dashboard.
  - [x] 4.2 In `apps/web/src/App.tsx`, register route `/topics/:topicId/evidence` protected by `ProtectedRoute` for `DISTRICT_HOKIM`.
  - [x] 4.3 In `apps/web/src/pages/HokimDashboardPage.tsx`, wire `selectedTopicId` state:
    - Desktop ($\ge 1024\text{px}$): opens `TopicEvidenceDrawer.tsx` beside the five-lane board.
    - Mobile ($< 1024\text{px}$): navigates to `/topics/:id/evidence`.
    - Closing drawer returns focus to originating card or invokes `useFocusFallback.ts` if card is no longer present.
  - [x] 4.4 In `apps/web/tests/unit/TopicEvidenceDrawer.test.tsx`, write component tests:
    - Drawer rendering with complete topic header and evidence timeline.
    - Anchor message in-situ highlighting without reordering.
    - In-place switching from Topic A to Topic B without closing drawer.
    - Telegram link button rendering when non-null and hidden when null.
    - Focus restoration on Close / Escape.
  - [x] 4.5 Run full verification:
    - API contracts build: `pnpm --filter @mahalla-ovozi/api-contracts build`
    - Backend build & tests: `pnpm --filter backend build`, `pnpm --filter backend test`
    - Web typecheck & tests: `pnpm --filter web typecheck`, `pnpm --filter web test`

### Review Findings

- [x] [Review][Decision] Background Cards TabIndex Suppression on Non-Modal Drawer — Resolved: Adopted Option 2 (Drawer focus management on heading + Escape/Close focus return with natural board tab order and high-contrast focus rings).
- [x] [Review][Patch] Missing `role="region"` Accessibility Landmark on Desktop Drawer [`apps/web/src/components/topics/TopicEvidenceDrawer.tsx:76-85`]
- [x] [Review][Patch] Ref Type Mismatch on Heading Ref [`apps/web/src/components/topics/TopicEvidenceDrawer.tsx:26, 110`]
- [x] [Review][Patch] Brittle Uzbek Substring Error Handling in Route [`apps/backend/src/modules/topics/hokim-topics-routes.ts:182-190`]
- [x] [Review][Patch] Telegram Group Username & ChatId Deep Link Sanitization [`apps/backend/src/modules/topics/topic-evidence-service.ts:67-81`]
- [x] [Review][Patch] User Metadata Username Sanitization [`apps/backend/src/modules/topics/topic-evidence-service.ts:95-99`]
- [x] [Review][Patch] Safe URI Encoding for topicId in Client [`apps/web/src/topics/hokim-topics-client.ts:70`]
- [x] [Review][Patch] Safe Fallback for Unknown Lane Identifiers [`apps/web/src/components/topics/TopicEvidenceDrawer.tsx:198`, `TopicEvidencePage.tsx:198`, `TopicCard.tsx:165`]
- [x] [Review][Patch] Synthetic Focus Bubbling Guard on TopicCard and EvidenceItem [`apps/web/src/components/topics/EvidenceItem.tsx:37`, `apps/web/src/components/topics/TopicCard.tsx:72`]
- [x] [Review][Patch] Progressive Pagination Counter Display Guard [`apps/web/src/components/topics/EvidenceTimeline.tsx:101`]
- [x] [Review][Patch] Drawer Dual Escape Key Listener Guard [`apps/web/src/components/topics/TopicEvidenceDrawer.tsx:76`]

---

## Dev Notes

### Architecture & Pattern Compliance
- **Hexagonal Modular Monolith (AD-1)**: Core evidence domain query logic lives in `apps/backend/src/modules/topics/topic-evidence-service.ts`, keeping HTTP routes thin.
- **Shared API Contracts (AD-10)**: Fastify routes and React clients share exact Zod schemas in `packages/api-contracts/src/topics.ts`. Database entities (`AcceptedEvidence`) never cross the API boundary directly.
- **Strict District Scope & Tenant Isolation (AD-9)**: Every evidence query validates `topic.district_id === actor.districtId`. Cross-district queries return sanitized 404 errors.
- **Privacy & Telemetry Boundary (AD-11)**: Citizen phone numbers and raw Telegram user IDs are strictly excluded from API response contracts and frontend state.
- **Database Isolation in Tests (AD-3)**: All integration tests in `apps/backend/tests/topic-evidence.test.ts` run strictly against the isolated test database `mahalla_ovozi_test`.

### Source Tree Modification Inventory

| Component / Layer | File Path | Action | Description |
| :--- | :--- | :--- | :--- |
| **API Contracts** | `packages/api-contracts/src/topics.ts` | **[MODIFY]** | Add `TopicEvidenceItemSchema`, `TopicEvidenceResponseSchema`, and `TopicEvidenceQuerySchema`. |
| **Backend Service** | `apps/backend/src/modules/topics/topic-evidence-service.ts` | **[NEW]** | Implement `TopicEvidenceService` with chronological queries, keyset pagination, privacy sanitization, and Telegram deep link resolution. |
| **Backend Routes** | `apps/backend/src/modules/topics/hokim-topics-routes.ts` | **[MODIFY]** | Register `GET /api/v1/hokim/topics/:id/evidence` with auth guard and query validation. |
| **Backend Tests** | `apps/backend/tests/topic-evidence.test.ts` | **[NEW]** | Integration tests for evidence retrieval, district isolation, pagination, and privacy. |
| **Frontend Client** | `apps/web/src/topics/hokim-topics-client.ts` | **[MODIFY]** | Add `fetchTopicEvidence` API client function. |
| **Frontend State** | `apps/web/src/topics/useTopicEvidence.ts` | **[NEW]** | TanStack Query v5 `useInfiniteQuery` hook for topic evidence caching and progressive pagination. |
| **Frontend UI** | `apps/web/src/components/topics/EvidenceItem.tsx` | **[NEW]** | Verbatim message card with Uzbek Cyrillic date/time, sender attribution, and Telegram action. |
| **Frontend UI** | `apps/web/src/components/topics/EvidenceTimeline.tsx` | **[NEW]** | Chronological message list with progressive continuation and scoped retry banner. |
| **Frontend UI** | `apps/web/src/components/topics/TopicEvidenceDrawer.tsx` | **[NEW]** | Desktop right-side non-modal complementary drawer (`mask={false}`) with in-place topic switching. |
| **Frontend UI** | `apps/web/src/components/topics/TopicCard.tsx` | **[MODIFY]** | Add `isSelected` active border styling and click handler. |
| **Frontend Page** | `apps/web/src/pages/TopicEvidencePage.tsx` | **[NEW]** | Mobile/narrow routed full-screen evidence view. |
| **Frontend Page** | `apps/web/src/pages/HokimDashboardPage.tsx` | **[MODIFY]** | Wire `selectedTopic` state, drawer rendering, and focus restoration. |
| **Frontend Routing** | `apps/web/src/App.tsx` | **[MODIFY]** | Add `/topics/:topicId/evidence` route for narrow viewports. |
| **Frontend Tests** | `apps/web/tests/unit/TopicEvidenceDrawer.test.tsx` | **[NEW]** | Unit and interaction tests for drawer rendering, switching, and keyboard accessibility. |
| **Frontend Tests** | `apps/web/tests/unit/useTopicEvidence.test.tsx` | **[NEW]** | Unit tests for evidence data hook and pagination state. |

### Learnings & Version-Specific Patterns
1. **TanStack Query v5 `useInfiniteQuery`**:
   - Always supply `initialPageParam: undefined`.
   - Never supply `placeholderData: keepPreviousData` for topic evidence queries, as this bleeds Topic A's evidence into Topic B's surface during network switching.
   - For scoped continuation retries, call `fetchNextPage()` instead of `refetch()`.
2. **Ant Design v5 Non-Modal Drawer**:
   - Use `mask={false}` and `rootStyle={{ pointerEvents: 'none' }}` to keep the 5-lane dashboard clickable.
   - Use `styles={{ section: { boxShadow: 'none', borderLeft: '1px solid #E2E8F0' }, wrapper: { boxShadow: 'none' } }}` to strictly satisfy `DESIGN.md` zero persistent box-shadow rules.
   - Use `role="region"` and `aria-label="Мавзу далиллари"` for accessible non-modal semantics.
3. **Drizzle Keyset SQL Tuple**:
   - Compare `(ae.original_timestamp, ae.telegram_message_id, ae.id) > (${cursorDate}, ${cursor.msgId}, ${cursor.id})` where all types match the `ORDER BY` index columns (`text` for `telegram_message_id`).
4. **Deterministic Keyset Cursor Guards**: Protect cursor decoding against `NaN` dates (`Number.isNaN(new Date(parsed.t).getTime())`) and return explicit HTTP 400 `VALIDATION_ERROR` on malformed cursors.
5. **High-Contrast Focus Rings**: Use CSS `outline: 2px solid #0284C7; outlineOffset: 2px;` rather than inline `boxShadow` to satisfy strict `DESIGN.md` zero persistent box-shadow rules.
6. **Deterministic Fallback Targets**: When closing overlays, if the opener card unmounts during review, use `useFocusFallback.ts` to target `lane-header-${lane}` or `dashboard-main-heading` with `tabIndex={-1}`.

### References
- [PRD Requirements: FR-12, FR-15](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-12-evidence-integrity-and-retention)
- [Epic 3 Story Breakdown: Story 3.2](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/epics/epic-3.md#story-32-inspect-complete-topic-evidence)
- [Architecture Spine: AD-1, AD-2, AD-9, AD-10, AD-11](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md)
- [UX Experience Spine: Evidence Detail & Detail Panel](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/EXPERIENCE.md#component-patterns)
- [Design Tokens & Components: DESIGN.md](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/DESIGN.md)

---

## Dev Agent Record

### Agent Model Used
- Gemini 3.7 Flash (High)

### Debug Log References
- Specification Review & Validation Phase (Adversarial, Edge Case, and Version Best-Practices Verified)

### Completion Notes List
- Comprehensive Story 3.2 specification authored and rigorously validated.
- Multi-layer verification against PRD FR-12/FR-15, Epic 3 ACs, and Architecture Invariants.
- TanStack Query v5, AntD 5, and Drizzle Keyset current patterns incorporated.
- Ready for implementation via `bmad-dev-story`.

### File List
- `_bmad-output/implementation-artifacts/3-2-inspect-complete-topic-evidence.md`


# Reconciliation — Dashboard Overview Prototype

- **Input:** [prototype-dashboard-overview-2026-08-05.png](imports/prototype-dashboard-overview-2026-08-05.png)
- **Authority:** Fallible visual input only. The PRD and canonical UX memlog determine the accepted contract; the review-state spines express it for implementation.

## Retained

| Screenshot idea | Retained contract |
|---|---|
| Overview-first dashboard | Keep the complete district signal landscape visible without AI urgency or attention ranking. |
| Compact top toolbar | Keep brand, fixed District, date, Mahalla, search, freshness, Help, and profile context together on desktop. |
| Five compact statistics | Keep a stable, filter-aware, read-only strip that summarizes the active result without implying service quality or representative opinion. |
| Five simultaneous service/Hokim columns | Keep the fixed left-to-right order Ҳокимга оид, Сув, Электр, Газ, Чиқинди and independent vertical Lane scrolling. |
| Compact, scan-friendly Topic cards | Keep the cautious summary, Mahalla, exact latest meaningful activity, and retained evidence count with readable density. |
| Quiet bordered surfaces | Keep restrained borders, light tonal separation, and little persistent elevation. |
| Semantic Lane differentiation | Keep restrained per-Lane accent/surface pairs and consistent outline icons, always paired with text meaning. |
| Direct date, Mahalla, and search access | Keep these as coordinated dashboard filters rather than separate pages. |
| Freshness in the primary chrome | Keep last-successful-update visibility and make delay explicit. |
| Help and account access | Keep both minimal and context-preserving. |

## Revised

| Screenshot idea | Revision |
|---|---|
| Latin product/UI wording | Render the in-product wordmark and all interface microcopy in Uzbek Cyrillic; retain original evidence language/script. |
| Today/Yesterday/Date controls | Use `Бугун`, `Кеча`, and `Сана бўйича`; the calendar supports one date or a retained date range and then shows the selected value. |
| One Mahalla dropdown | Preserve one-or-all selection and make it update every selected Lane and all statistics together. |
| Search field | Debounce ordinary plain-text search by about 400 ms across summary, evidence, username, and display name within active filters; provide an explicit clear action and temporary match context only when needed. |
| Visible five Lanes only | Add `Йўналишлар: N/5` multi-select for any one-or-more fixed Lanes; never allow zero Lanes or custom categories. |
| Per-Lane header count badge | Use a textual in-session new-item count that navigates to newly added Topics without shifting the current viewport; do not turn it into urgency. |
| Topic-card click target | Make the whole card the single primary control for opening the canonical Topic's evidence detail; keep secondary actions separate. |
| Topic freshness/order | Sort by latest meaningful activity on a new visit, but preserve card positions and every Lane scroll during background refresh. Mark changes with `Янги` or `Янгиланди`. |
| One card in one column appearance | When one canonical Topic appears in multiple Lanes, each appearance opens the same detail and shows a short textual additional-Lane indicator. |
| Card time display | Use exact Asia/Tashkent `HH:mm` for a single-day view and `DD.MM.YYYY, HH:mm` for date ranges; no relative time. |
| Always-current freshness impression | Keep valid data visible, show last successful update, and present the exact persistent delayed-processing warning when recent coverage may be incomplete. |
| Desktop-only dense board | Keep five Lanes on the primary desktop envelope; use lane-aligned horizontal scrolling on tablet/phone and full-screen detail on narrow screens. |
| Colorful functional icon cues | Limit color to consistent semantic outline icons; pair uncertain meanings with text and honor reduced motion. |
| Visual statistics hierarchy | Keep neutral values and filter-aware context; make every statistic non-focusable and non-clickable, with no implicit filter behavior. |

## Rejected

| Screenshot idea | Reason |
|---|---|
| Latin UI | MVP interface language is Uzbek Cyrillic only; there is no language switcher or Latin option. |
| Red logo and red brand accent | The shown logo is explicitly rejected. MVP uses the text-only **Маҳалла Овози** wordmark and Civic Teal primary palette. |
| `AI XULOSASI` card label | The summary is already the primary card content; an AI spectacle label adds noise and shifts trust away from evidence. |
| Evidence quote previews on Topic cards | Cards remain compact and evidence-preview-free. Complete original evidence belongs in chronological detail; search-only match context is the sole temporary exception. |
| AI subcategory tags such as service-pressure or street-lighting labels | No approved subcategory taxonomy, evaluation scope, or related filter exists in MVP. Lane placement and cautious summary are sufficient. |
| Prototype icon styling | Its filled, mixed-weight, decorative treatment is non-authoritative. Use one restrained semantic outline system selected later by implementation. |
| Paper-plane action inside quote previews | Telegram navigation belongs to each complete evidence item in detail, labelled clearly as `Telegramда очиш`, and is best effort. |
| Colored total-count pills as importance cues | Lane position and count must not imply urgency, ranking, health, or performance; only the textual in-session new-item affordance has accepted behavior. |
| Fixed example people, places, counts, quotes, and timestamps | They are illustrative pixels, not product data, default content, or test fixtures. Initial loading must never invent values. |
| Any implied AI urgency, sentiment, service score, or prioritization | The dashboard remains neutral and overview-first; the Hokim owns interpretation and response. |

No accepted qualitative idea from the screenshot was dropped silently: every visible structural, navigational, content, color, icon, and interaction cue is retained, revised, or rejected above.

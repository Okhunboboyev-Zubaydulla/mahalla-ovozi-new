# Reconciliation — Dashboard Overview Prototype

- **Input:** [prototype-dashboard-overview-2026-08-05.png](imports/prototype-dashboard-overview-2026-08-05.png) & `dashboard-UI-prototype/`
- **Authority:** Reconciled and aligned with UX/UI specifications on 2026-08-23. The prototype's approved visual identity and styling are formally adopted into the design system.

## Retained & Approved

| Prototype / UI Element | Retained & Approved Specification |
|---|---|
| Overview-first dashboard | Keep the complete district signal landscape visible across 5 columns without artificial urgency or ranking. |
| Compact top toolbar | Brand **Маҳалла Овози**, fixed District **Шароф Рашидов тумани**, date buttons, Mahalla select, `Йўналишлар: N/5` filter, search, freshness, Help, and profile. |
| Five compact statistics cards | Read-only strip with colored icon boxes (`#FEE2E2`, `#FCE7F3`, `#DBEAFE`, `#F3E8FF`, `#D1FAE5`) summarizing active results neutrally. |
| Five simultaneous service columns | Fixed left-to-right order Ҳокимга оид, Сув, Электр, Газ, Чиқинди and independent vertical lane scrolling. |
| Rich Topic Card anatomy | Cautious AI summary, `AI ХУЛОСАСИ` label, subcategory pill tag, Mahalla, timestamp, evidence count, and citizen quote snippet box with paper-plane icon. |
| Freshness & Multi-lane states | `Янги` (green pill) for new topics, `Янгиланди` (amber pill) for updated topics, and `Ҳам: [Йўналиш]` for multi-lane assignments. |
| Restrained elevation & soft shadows | Bordered surfaces with subtle elevation (`0 1px 3px rgba(0,0,0,0.03)`) and smooth hover lift (`translateY(-2px)`). |
| Semantic category color system | Restrained per-lane accent and quiet surface pairs (`#EF4444`, `#2563EB`, `#7C3AED`, `#EA580C`, `#059669`). |
| Slide-out Evidence Detail Drawer | Category tag, Mahalla title, AI summary card, metadata, multi-lane links, chronological evidence thread, and `Telegramда очиш` button. |

## Revised for Consistency

| Prototype Idea | Applied Revision |
|---|---|
| Interface language | Rendered in Uzbek Cyrillic (**Маҳалла Овози**, **Шароф Рашидов тумани**, `Бугун`, `Кеча`, `Сана бўйича`, `Ҳокимга оид`, `Сув`, `Электр`, `Газ`, `Чиқинди`). |
| Date controls | Segmented buttons for `Бугун`, `Кеча` and `Сана бўйича` with custom date range popover. |
| Lane visibility filter | Added `Йўналишлар: N/5` multi-select dropdown permitting 1 to 5 visible columns (never 0). |
| Search field | Debounced by 400 ms across summary, evidence, sender name, and username; highlights keyword matches. |
| Metric calculations | Dynamically recalculates totals, Hokim evidence, active mahallas, and top service/mahalla across all active filters. |
| Responsive board navigation | Added `Олдинги устун` / `Кейинги устун` navigation controls when columns exceed screen width. |
| Accessibility & Keyboard | Full focus management, focus trap on Drawer and modals, Escape key restoration, and ARIA live announcements in Uzbek Cyrillic. |

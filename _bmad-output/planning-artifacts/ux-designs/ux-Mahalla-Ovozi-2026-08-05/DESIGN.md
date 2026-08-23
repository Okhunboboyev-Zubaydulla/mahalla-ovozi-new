---
name: Mahalla Ovozi
description: Calm, evidence-first visual identity for the Mahalla Ovozi district signal experience, harmonized with the approved prototype design.
status: final
sources:
  - ../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md
updated: 2026-08-23
colors:
  surface-page: '#F4F6F8'
  surface-raised: '#FFFFFF'
  surface-subtle: '#F8FAFC'
  text-primary: '#0F172A'
  text-secondary: '#64748B'
  border: '#E2E8F0'
  boundary-essential: '#94A3B8'
  primary: '#0284C7'
  on-primary: '#FFFFFF'
  focus: '#0284C7'
  lane-hokim: '#EF4444'
  lane-hokim-surface: '#FEE2E2'
  lane-water: '#2563EB'
  lane-water-surface: '#DBEAFE'
  lane-electricity: '#7C3AED'
  lane-electricity-surface: '#F3E8FF'
  lane-gas: '#EA580C'
  lane-gas-surface: '#FFEDD5'
  lane-waste: '#059669'
  lane-waste-surface: '#D1FAE5'
  warning: '#D97706'
  warning-surface: '#FEF3C7'
  search-match: '#F5DD77'
  search-match-text: '#0F172A'
typography:
  wordmark:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  statistic-value:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
  lane-heading:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
  topic-summary:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 13.5px
    fontWeight: '600'
    lineHeight: 20px
  evidence-message:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 13.5px
    fontWeight: '400'
    lineHeight: 21px
  control:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 20px
  metadata:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  pill: 9999px
  DEFAULT: 10px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '6': 24px
  '8': 32px
targets:
  touch-min: 44px
  compact-gap: 8px
components:
  application-shell:
    background: '{colors.surface-page}'
    foreground: '{colors.text-primary}'
    separator: '{colors.border}'
  filter-bar:
    background: '{colors.surface-raised}'
    foreground: '{colors.text-primary}'
    border: '{colors.boundary-essential}'
    radius: '{rounded.md}'
    gap: '{spacing.2}'
  metric-card:
    background: '{colors.surface-raised}'
    foreground: '{colors.text-primary}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
    padding: '{spacing.4}'
  lane-board:
    background: '{colors.surface-page}'
    gap: '{spacing.4}'
    header-type: '{typography.lane-heading}'
  topic-card:
    background: '{colors.surface-raised}'
    foreground: '{colors.text-primary}'
    border: '{colors.border}'
    selected-border: '{colors.primary}'
    radius: '{rounded.lg}'
    padding: '{spacing.4}'
    gap: '{spacing.3}'
  detail-panel:
    background: '{colors.surface-raised}'
    foreground: '{colors.text-primary}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
  data-collection:
    background: '{colors.surface-raised}'
    foreground: '{colors.text-primary}'
    border: '{colors.border}'
    row-gap: '{spacing.3}'
  setup-checklist:
    background: '{colors.surface-raised}'
    foreground: '{colors.text-primary}'
    border: '{colors.border}'
    radius: '{rounded.DEFAULT}'
    gap: '{spacing.3}'
  form-panel:
    background: '{colors.surface-raised}'
    foreground: '{colors.text-primary}'
    border: '{colors.boundary-essential}'
    focus: '{colors.focus}'
    radius: '{rounded.DEFAULT}'
    gap: '{spacing.4}'
  status-message:
    background: '{colors.surface-subtle}'
    foreground: '{colors.text-primary}'
    warning-background: '{colors.warning-surface}'
    warning-foreground: '{colors.warning}'
    border: '{colors.border}'
    radius: '{rounded.DEFAULT}'
  action-control:
    primary-background: '{colors.primary}'
    primary-foreground: '{colors.on-primary}'
    secondary-background: '{colors.surface-raised}'
    secondary-foreground: '{colors.text-primary}'
    border: '{colors.boundary-essential}'
    focus: '{colors.focus}'
    radius: '{rounded.md}'
    touch-min: '{targets.touch-min}'
    compact-gap: '{targets.compact-gap}'
  confirmation-dialog:
    background: '{colors.surface-raised}'
    foreground: '{colors.text-primary}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
    gap: '{spacing.4}'
  progressive-loader:
    background: '{colors.surface-subtle}'
    foreground: '{colors.text-secondary}'
    border: '{colors.border}'
    radius: '{rounded.DEFAULT}'
---

# Mahalla Ovozi — Design Spine

## Brand & Style

Mahalla Ovozi uses a calm civic-intelligence posture: trustworthy, restrained, evidence-first, and information-dense without crowding. It is modern without fashion cues and serious without bureaucratic ceremony.

The in-product wordmark is the Cyrillic text **Маҳалла Овози**, paired with the district badge **Шароф Рашидов тумани** and the Azure Blue primary brand mark.

The visual style is fully harmonized with the approved prototype: clean white raised cards, subtle card elevation (`0 1px 3px rgba(0,0,0,0.03)`), smooth hover interaction (`translateY(-2px)` with soft shadow), semantic lane outlines, and structured topic cards featuring AI summaries, subcategory pill badges, and direct citizen quote snippets.

## Colors

The product is light-only for MVP. The Azure Slate palette uses `{colors.surface-page}` as the main canvas, `{colors.surface-raised}` for readable content surfaces, and `{colors.surface-subtle}` for quiet grouping. Text uses `{colors.text-primary}` and `{colors.text-secondary}`. `{colors.border}` provides structural separation, while `{colors.boundary-essential}` identifies inputs, buttons, and selectable cards.

`{colors.primary}` (`#0284C7`) marks primary actions, active filters, and selection states. Visible keyboard focus uses a distinct 2px outline ring with 2px offset.

Lane accents are restrained semantic outlines and header badges:

| Lane | Accent | Surface |
|---|---|---|
| Ҳокимга оид | `{colors.lane-hokim}` (`#EF4444`) | `{colors.lane-hokim-surface}` (`#FEE2E2`) |
| Сув | `{colors.lane-water}` (`#2563EB`) | `{colors.lane-water-surface}` (`#DBEAFE`) |
| Электр | `{colors.lane-electricity}` (`#7C3AED`) | `{colors.lane-electricity-surface}` (`#F3E8FF`) |
| Газ | `{colors.lane-gas}` (`#EA580C`) | `{colors.lane-gas-surface}` (`#FFEDD5`) |
| Чиқинди | `{colors.lane-waste}` (`#059669`) | `{colors.lane-waste-surface}` (`#D1FAE5`) |

Warnings use `{colors.warning}` on `{colors.warning-surface}`. Search matches use `{colors.search-match-text}` on `{colors.search-match}` without altering the original evidence text.

## Typography

Use one highly legible system sans-serif stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`). All interface microcopy and summaries use the Uzbek Cyrillic alphabet including `Ў ў Қ қ Ғ ғ Ҳ ҳ`:

| Role | Token | Usage |
|---|---|---|
| Wordmark | `{typography.wordmark}` | **Маҳалла Овози** wordmark in application header. |
| Statistic value | `{typography.statistic-value}` | Number in top 5 metric cards. |
| Lane heading | `{typography.lane-heading}` | Fixed Lane title (`Ҳокимга оид`, `Сув`, `Электр`, `Газ`, `Чиқинди`). |
| Topic summary | `{typography.topic-summary}` | Cautious AI summary on Topic cards. |
| Evidence message | `{typography.evidence-message}` | Verbatim citizen message text in Drawer. |
| Toolbar and form control | `{typography.control}` | Control labels, date buttons, mahalla selector, and search input. |
| Metadata and state label | `{typography.metadata}` | Timestamps, evidence counts, `Янги`, `Янгиланди`, and multi-lane badges. |

## Layout & Spacing

Spacing scale: `{spacing.1}` (4px), `{spacing.2}` (8px), `{spacing.3}` (12px), `{spacing.4}` (16px), `{spacing.6}` (24px), `{spacing.8}` (32px).

The desktop layout features a compact sticky single-row toolbar, a 5-card statistics strip, and a 5-column signal board with independent vertical scrolling per lane. On narrower screens, responsive lane navigation controls (`Олдинги устун` / `Кейинги устун`) enable smooth horizontal inspection.

## Elevation & Depth

- Cards & containers: subtle persistent elevation (`box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03)`).
- Hover state: `transform: translateY(-2px); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06)`.
- Popovers & Menus: floating shadow (`box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1)`).
- Evidence Drawer: slide-out overlay shadow (`box-shadow: -6px 0 28px rgba(0, 0, 0, 0.12)`).

## Shapes

- Small tags & controls: `{rounded.sm}` (6px).
- Buttons, dropdowns & inputs: `{rounded.md}` (10px).
- Topic cards, metric cards & modal dialogs: `{rounded.lg}` (14px).
- Status badges & pill tags: `{rounded.pill}` (9999px).

## Components

| Component | Visual & Behavioral Contract |
|---|---|
| `application-shell` | Light canvas (`#F4F6F8`), clean header toolbar, Cyrillic **Маҳалла Овози** wordmark and **Шароф Рашидов тумани** district badge. |
| `filter-bar` | Compact date buttons (`Бугун`, `Кеча`, `Сана бўйича` with date range popover), Mahalla select dropdown, and `Йўналишлар: N/5` multi-select column filter. |
| `metric-card` | Read-only raised card with rounded colored icon square (`#FEE2E2`, `#FCE7F3`, `#DBEAFE`, `#F3E8FF`, `#D1FAE5`), bold number, and filter-aware neutral subtitle. |
| `lane-board` | 5 fixed semantic columns (`Ҳокимга оид`, `Сув`, `Электр`, `Газ`, `Чиқинди`) with column count badges, independent vertical scroll, and responsive navigation controls. |
| `topic-card` | Rich, scan-friendly card: `AI ХУЛОСАСИ` label, `Янги`/`Янгиланди` badge, cautious summary, subcategory pill tag, multi-lane indicator (`Ҳам: ...`), metadata row (Mahalla, time, evidence count), and citizen quote snippet box with paper-plane icon. |
| `detail-panel` (Drawer) | Raised floating card detail surface (top/bottom/right 14px/16px insets, rounded corners) with a subtle overlay shadow; category tag, Mahalla title, AI summary card, metadata, multi-lane links, chronological evidence thread, and `Telegramда очиш` action. |
| `help-modal` | Accessible modal explaining system principles, lane purposes, signal vs fact limits, and Hokim decision ownership. |
| `action-control` | Minimum 44px touch targets on mobile/tablet, clear focus rings, and prompt status feedback. |

## Do's and Don'ts

| Do | Don't |
|---|---|
| Use **Маҳалла Овози** and Uzbek Cyrillic for all interface copy and mock data. | Use Latin interface labels or untranslated UI text. |
| Retain the approved prototype visual design: quote snippets, subcategory pills, colored icon squares, and soft card elevation. | Revert to a stark wireframe or strip approved visual affordances. |
| Keep statistics filter-aware, neutral, and factual across all filter combinations. | Introduce opinionated satisfaction rankings or subjective service scores. |
| Support `Йўналишлар: N/5` multi-select without ever permitting 0 visible lanes. | Force all 5 lanes to be fixed without user customization. |

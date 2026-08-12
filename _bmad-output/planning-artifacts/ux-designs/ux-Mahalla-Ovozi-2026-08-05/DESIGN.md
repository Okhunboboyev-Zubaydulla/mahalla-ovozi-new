---
name: Mahalla Ovozi
description: Calm, evidence-first visual identity for the Mahalla Ovozi district signal experience.
status: final
sources:
  - ../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md
updated: 2026-08-11
colors:
  surface-page: '#F5F7F6'
  surface-raised: '#FFFFFF'
  surface-subtle: '#EDF3F1'
  text-primary: '#172321'
  text-secondary: '#52615E'
  border: '#C9D5D1'
  boundary-essential: '#6B7C77'
  primary: '#0F5C5E'
  on-primary: '#FFFFFF'
  focus: '#007A7C'
  lane-hokim: '#3F4B7A'
  lane-hokim-surface: '#F0F1F8'
  lane-water: '#1F6688'
  lane-water-surface: '#EAF4F8'
  lane-electricity: '#765300'
  lane-electricity-surface: '#FBF3DF'
  lane-gas: '#81462F'
  lane-gas-surface: '#F7EEE9'
  lane-waste: '#356848'
  lane-waste-surface: '#EAF3EC'
  warning: '#6B4B00'
  warning-surface: '#FFF4D6'
  search-match: '#F5DD77'
  search-match-text: '#172321'
typography:
  wordmark:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  statistic-value:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
  lane-heading:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  topic-summary:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  evidence-message:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  control:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 22px
  metadata:
    fontFamily: 'system-ui, sans-serif'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  DEFAULT: 8px
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
    radius: '{rounded.DEFAULT}'
    gap: '{spacing.2}'
  metric-card:
    background: '{colors.surface-raised}'
    foreground: '{colors.text-primary}'
    border: '{colors.border}'
    radius: '{rounded.DEFAULT}'
    padding: '{spacing.4}'
  lane-board:
    background: '{colors.surface-page}'
    gap: '{spacing.4}'
    header-type: '{typography.lane-heading}'
  topic-card:
    background: '{colors.surface-raised}'
    foreground: '{colors.text-primary}'
    border: '{colors.boundary-essential}'
    selected-border: '{colors.primary}'
    radius: '{rounded.DEFAULT}'
    padding: '{spacing.4}'
    gap: '{spacing.3}'
  detail-panel:
    background: '{colors.surface-raised}'
    foreground: '{colors.text-primary}'
    border: '{colors.border}'
    radius: '{rounded.DEFAULT}'
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
    radius: '{rounded.DEFAULT}'
    touch-min: '{targets.touch-min}'
    compact-gap: '{targets.compact-gap}'
  confirmation-dialog:
    background: '{colors.surface-raised}'
    foreground: '{colors.text-primary}'
    border: '{colors.border}'
    radius: '{rounded.DEFAULT}'
    gap: '{spacing.4}'
  progressive-loader:
    background: '{colors.surface-subtle}'
    foreground: '{colors.text-secondary}'
    border: '{colors.border}'
    radius: '{rounded.DEFAULT}'
---

# Mahalla Ovozi — Design Spine

## Brand & Style

Mahalla Ovozi uses a calm civic-intelligence posture: trustworthy, restrained, evidence-first, and information-dense without crowding. It is modern without fashion cues and serious without bureaucratic ceremony. It must never resemble a commercial analytics spectacle, a gamified monitoring tool, or an automated decision system.

The in-product wordmark is the Cyrillic text **Маҳалла Овози**. It uses deliberate sans-serif typography with no permanent symbol; the canonical English and technical project name remains Mahalla Ovozi.

The imported [dashboard prototype](imports/prototype-dashboard-overview-2026-08-05.png) is a fallible composition input. `DESIGN.md` and `EXPERIENCE.md` win on every conflict with that image.

## Colors

The product is light-only for MVP. The Civic Teal palette uses `{colors.surface-page}` as the main canvas, `{colors.surface-raised}` for readable content surfaces, and `{colors.surface-subtle}` for quiet grouping. Text uses `{colors.text-primary}` and `{colors.text-secondary}`. `{colors.border}` is limited to decorative separators; `{colors.boundary-essential}` identifies inputs, buttons, selectable cards, and any other control or region whose boundary is required for recognition. Essential boundaries maintain at least 3:1 contrast against every adjacent surface. Focus and selection remain separate semantic states and must stay distinguishable from the resting boundary.

`{colors.primary}` marks primary actions and selection, while `{colors.focus}` is reserved only for visible keyboard focus. When an item is both selected and keyboard-focused, show its selected boundary together with a separate focus ring so both states remain distinguishable. The accepted load-bearing pairs meet WCAG AA for normal text. State meaning always includes text or an accessible label and never depends on color.

Lane accents are restrained semantic outlines or header details, paired with their quiet surfaces:

| Lane | Accent | Surface |
|---|---|---|
| Ҳокимга оид | `{colors.lane-hokim}` | `{colors.lane-hokim-surface}` |
| Сув | `{colors.lane-water}` | `{colors.lane-water-surface}` |
| Электр | `{colors.lane-electricity}` | `{colors.lane-electricity-surface}` |
| Газ | `{colors.lane-gas}` | `{colors.lane-gas-surface}` |
| Чиқинди | `{colors.lane-waste}` | `{colors.lane-waste-surface}` |

Warnings use `{colors.warning}` on `{colors.warning-surface}`. Search matches use `{colors.search-match-text}` on `{colors.search-match}` without altering the preserved evidence text. Do not infer urgency, quality, sentiment, or service performance from lane or statistic colors.

## Typography

Use one highly legible system sans-serif stack with stable browser rendering. Acceptance-test the implementation stack for the complete Uzbek Cyrillic alphabet—including `Ў ў Қ қ Ғ ғ Ҳ ҳ`—across every supported browser and OS family, and provide glyph-capable fallbacks for mixed-script evidence. The approved ramp is fixed:

| Role | Token | Usage |
|---|---|---|
| Wordmark | `{typography.wordmark}` | Product name in application chrome. |
| Statistic value | `{typography.statistic-value}` | Primary number in a read-only metric card. |
| Lane heading | `{typography.lane-heading}` | Fixed Lane title. |
| Topic summary | `{typography.topic-summary}` | Complete cautious summary on a Topic card. |
| Evidence message | `{typography.evidence-message}` | Original Accepted Evidence text. |
| Toolbar and form control | `{typography.control}` | Control labels and entered or selected values. |
| Metadata and state label | `{typography.metadata}` | Timestamps, counts, attribution, and explicit states. |

No user-facing text is smaller than 14 px. Topic summaries are never line-clamped or ellipsized; concise source generation controls their length. Labels, buttons, chips, and other controls grow or wrap without fixed-height glyph clipping or displaced actions. Long District and Mahalla names and status labels wrap safely without losing meaning. Prose and evidence wrap normally while original evidence line breaks remain preserved. Safely break long unbroken technical identifiers while keeping their complete value visually and programmatically available. Preserve the ramp on smaller effective CSS viewports, including browser zoom, and reflow into the applicable tablet or phone composition instead. At 200% zoom and a 320 CSS-pixel equivalent viewport, text and controls remain usable without clipping, overlap, or hidden actions.

## Layout & Spacing

Use the spacing scale defined by `{spacing.1}`, `{spacing.2}`, `{spacing.3}`, `{spacing.4}`, `{spacing.6}`, and `{spacing.8}`. Topic-card padding is `{spacing.4}` and the vertical gap between cards is `{spacing.3}`. Apply the same rhythm to toolbar groups, statistics, lane headers, drawers, forms, tables, and responsive reflow.

When the effective CSS viewport supports the primary desktop composition, the Hokim surface keeps a compact sticky single-row toolbar, a visible five-card statistics strip, and the fixed lane order Ҳокимга оид, Сув, Электр, Газ, Чиқинди. Narrower effective viewports activate the existing tablet or phone toolbar, navigation, statistics, board, form, and detail patterns. Console surfaces prioritize stable District context, dense readable records, and focused editing. Spacing may contract through composition but never by shrinking the approved type ramp. Prevent page-level horizontal overflow; only intentional labelled Lane-board, matrix, or diff regions may scroll horizontally.

## Elevation & Depth

Use borders and tonal layering for persistent hierarchy. Cards, lists, tables, toolbar regions, and lane containers have no persistent shadow. Reserve one subtle elevation level for temporary or overlaid surfaces: detail panels, menus, filter sheets, and confirmations. Focus and selection use explicit outlines, not card lifting.

## Shapes

`{rounded.DEFAULT}` is the standard radius for cards, controls, panels, and dialogs. Keep the silhouette restrained and functional; avoid exaggerated pills, bubbles, or decorative geometry. Icons use a consistent fine outline with semantic color, never filled cartoon shapes or illustrations.

## Components

| Component | Visual contract |
|---|---|
| `application-shell` | Light page canvas, stable separators, Cyrillic text wordmark; dashboard toolbar or Console sidebar/header establishes context without decorative chrome. |
| `filter-bar` | Compact raised grouping, thin border, visible labels, readable selected values, and a `{colors.focus}` focus ring. |
| `metric-card` | Read-only raised surface; statistic value dominates, label and neutral comparison remain secondary; never looks clickable. |
| `lane-board` | Fixed semantic lane accents, stable headers, readable fixed-width columns, and no activity-ranked visual hierarchy. Whenever all five Lanes do not fit, show visible Previous Lane and Next Lane controls beside the labelled horizontal board region. |
| `topic-card` | Bordered compact surface with complete summary, metadata, text state labels, and a clear selected outline; no quote preview, AI subcategory tag, shadow lift, or truncation. |
| `detail-panel` | Raised detail surface with a subtle overlay shadow; normal-flow compact header precedes content; full-screen variant preserves the same visual hierarchy. |
| `data-collection` | Dense semantic table, matrix, list, timeline, or stacked-record presentation using separators and aligned metadata. Stacked records repeat every visible field label. Comparison-essential matrices and diffs keep the identifying column visually sticky inside a clearly labelled horizontal scroll region; identifying context remains prominent. |
| `setup-checklist` | Raised checklist grouping with explicit incomplete, passed, and failed text states; blockers sit beside the inactive activation action. |
| `form-panel` | Single-purpose field grouping with persistent labels, associated inline error/help text, unsaved-state text, and a clear save boundary. After failed Save, place one focusable error summary at the form start with the error count and links to invalid fields; preserve every valid value. |
| `status-message` | Inline or local status surface; icon plus factual text, with warning treatment only when warranted; never color-only or toast-only. |
| `action-control` | Text-labelled primary, secondary, link, icon-with-label, or compact icon action with visible focus; icons never carry ambiguous meaning alone. On phone and tablet, every interactive control uses at least a `{targets.touch-min}` activation area; every icon-only control meets the same minimum at every width. Adjacent compact targets keep `{targets.compact-gap}` separation, and padded activation areas never overlap. Visible text or icons may remain compact inside the compliant area. |
| `confirmation-dialog` | Calm consequence summary, explicit scope and safe cancel emphasis; destructive confirmation is visually serious without dramatic red spectacle. |
| `progressive-loader` | Structure-matching skeleton or lane/list continuation control using quiet surfaces; no invented values and no motion under reduced-motion preference. |

## Do's and Don'ts

| Do | Don't |
|---|---|
| Use **Маҳалла Овози** and Uzbek Cyrillic for all interface copy. | Use Latin interface labels, transliteration, or the rejected red prototype logo. |
| Use restrained semantic outline icons consistently by concept and action. | Reuse the prototype icon styling, arbitrary multicolor icons, or decorative illustration. |
| Preserve evidence hierarchy, readable summaries, and stable context. | Add evidence quote previews, AI subcategory tags, sentiment, scores, urgency, or ranking. |
| When motion is allowed, use 120–180 ms functional transitions for panels, filters, focus, selection, and revealed content. | Add lift, bounce, pulse, parallax, or decorative motion. |
| Under `prefers-reduced-motion: reduce`, make drawer, sheet, filter, reveal, and every programmatic-scroll transition immediate; snap Lane alignment directly, disable skeleton animation, and preserve focus, selection, progress, and other essential feedback as static states. | Depend on animation to communicate state, retain smooth scrolling, or animate across the Lane board. |
| Keep visual implementation neutral and map these tokens into the chosen technical UI foundation later. | Lock the product to a UI framework or icon package in this spine. |

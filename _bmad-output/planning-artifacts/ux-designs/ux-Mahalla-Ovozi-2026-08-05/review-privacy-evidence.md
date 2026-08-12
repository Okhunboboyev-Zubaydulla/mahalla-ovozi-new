# Privacy and Evidence-Boundary Review

## Overall verdict: STRONG — NO CURRENT FINDINGS

The definitive review finds the current UX contract complete and internally coherent for the PRD's bounded MVP privacy and evidence boundary. The approved deduplication patch changed contract ownership and cross-references only; it did not weaken, remove, or contradict any privacy/evidence behavior. The Telegram bot-token active-transaction boundary remains complete.

## Counts

- Critical: 0
- High: 0
- Medium: 0
- Low: 0
- Total: 0

## Review basis

Read completely and independently cross-checked against the live canonical PRD, `.memlog.md`, `DESIGN.md`, `EXPERIENCE.md`, and current `bmad-ux` validation rules. The previous report was not used as evidence. The review stayed inside the approved lightweight MVP and did not introduce enterprise privacy administration, legal workflows, consent management, data-residency controls, custom key management, or automatic personal-data redaction.

## Deduplication regression check — strong

- The deduplication decision explicitly preserves behavior and token values while making `metric-card` the complete owner of responsive statistics navigation and `action-control` the complete owner of touch-target behavior (`.memlog.md:108`).
- The current component contracts retain the complete behavior (`EXPERIENCE.md:63`, `EXPERIENCE.md:71`). Interaction Primitives, Accessibility Floor, and Responsive & Platform now reference those owners while preserving section-specific keyboard, accessibility, and layout consequences (`EXPERIENCE.md:107-108`, `EXPERIENCE.md:127`, `EXPERIENCE.md:138`).
- No privacy/evidence rule was part of the removed duplication. Role or District authorization, stale/offline precedence, search persistence, standing-access disclosure, evidence identity, error sanitization, credentials, retention/deletion, audit text, and manual AI validation remain directly stated in their owning sections.

## Telegram bot-token boundary — strong

- **Active-transaction only:** the raw token may exist only during the current secret-entry and validation transaction (`.memlog.md:105`, `EXPERIENCE.md:77`).
- **No persistent or observable copies:** resumable District-setup drafts, URLs, browser history, persistent browser storage, restored page state, autofill, analytics, telemetry, routine logs, errors, and Audit History are all prohibited (`.memlog.md:105`, `EXPERIENCE.md:77`). This carries the PRD's server-side credential and redacted-audit rules into the UX contract (`../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md:361-368`, `../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md:399-404`, `../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md:572-579`).
- **Complete clearing and re-entry:** successful server-side storage, dismissal or navigation, reload, and District change clear the raw value; any interrupted transaction requires explicit re-entry (`.memlog.md:105`, `EXPERIENCE.md:77`).
- **Safe resumability:** only non-secret validation/status metadata and other non-secret setup values persist. The unsaved-change contract explicitly excludes the token from resumable drafts, and UJ-3 confirms that interrupted token entry or validation never restores it (`EXPERIENCE.md:94`, `EXPERIENCE.md:221-230`).
- **No dirty-form contradiction:** general form preservation applies while the current transaction remains active (`EXPERIENCE.md:69`, `EXPERIENCE.md:91-94`). Continue editing cancels the requested transition; Discard, successful Save, actual navigation, reload, or District change ends the transaction and invokes the token-clearing rule.
- **Replacement, Cancellation, and recovery remain coherent:** a replacement token is validated before confirmed swap, Cancellation removes the stored token, and recovery requires a new validated token; every raw token follows the same active-transaction boundary (`../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md:361-368`, `../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md:489-500`, `.memlog.md:61`, `EXPERIENCE.md:114`, `EXPERIENCE.md:232-241`).

## Full MVP privacy and evidence matrix — strong

- **Roles and District isolation:** only Hokim and Product Owner roles exist; Hokim authorization resolves deterministically to one District; wrong-role and cross-District denial reveals no protected data; only Product Owner may view across Districts (`../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md:23-29`, `../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md:333-342`, `../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md:370-379`, `EXPERIENCE.md:13-21`, `EXPERIENCE.md:84`, `EXPERIENCE.md:90`).
- **All-District versus explicit District:** aggregate operational surfaces may use all-District context; Topics/evidence, credentials, mappings, accounts, District settings, and destructive actions require one explicit District, and no evidence result mixes Districts (`.memlog.md:56`, `.memlog.md:62-69`, `EXPERIENCE.md:26-37`).
- **Atomic District switching:** the dirty-form decision precedes transition; after Discard or successful Save, all prior-District content-bearing state is cleared before loading; earlier requests are cancelled or ignored (`.memlog.md:77`, `.memlog.md:95`, `EXPERIENCE.md:37`, `EXPERIENCE.md:94`). Token clearing on District change remains explicit (`.memlog.md:105`, `EXPERIENCE.md:77`).
- **Stale/offline security precedence:** retained screen data remains only while session, role, District authorization, role-specific lifecycle access, and retention permit it. Offline mode is read-only, blocks and never queues mutations, and revalidates access before restoring actions (`.memlog.md:76`, `.memlog.md:84-85`, `.memlog.md:101`, `EXPERIENCE.md:84-85`).
- **Search privacy:** search stays within active scope, never indexes or searches phone numbers, never persists sensitive query text in browser/audit/analytics/telemetry/logging channels, and clears on sign-out, session expiry, permission loss, or District change (`.memlog.md:78`, `.memlog.md:81`, `EXPERIENCE.md:112-113`).
- **Standing-access disclosure:** onboarding blocks activation until the existing customer-arrangement disclosure is confirmed and audits only District, actor, and time; first sign-in provides a factual notice without creating a consent gate (`../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md:344-354`, `.memlog.md:79-80`, `EXPERIENCE.md:22`, `EXPERIENCE.md:68`, `EXPERIENCE.md:223-230`).
- **Evidence identity and fidelity:** every evidence/search context uses Telegram username when available, otherwise display name; phone numbers are never inferred, indexed, searched, or displayed. Original language, script, line breaks, chronology, and retained evidence integrity are preserved (`../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md:245-253`, `.memlog.md:81`, `EXPERIENCE.md:43`, `EXPERIENCE.md:112-113`, `EXPERIENCE.md:129`).
- **Sanitized failures and diagnostics:** every visible error surface excludes resident content, credentials, bot tokens, provider keys, secrets, and raw upstream bodies (`../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md:448-459`, `.memlog.md:82`, `EXPERIENCE.md:97`).
- **One-time Hokim credentials:** generated passwords remain confined to the dedicated one-time surface and are excluded from URLs, persistent/restored state, autofill, errors, telemetry, logs, and Audit History (`.memlog.md:83`, `EXPERIENCE.md:31`, `EXPERIENCE.md:70`, `EXPERIENCE.md:93`).
- **Lifecycle, retention, deletion, and recovery:** Hokim access stops on Suspension/Cancellation; Product Owner access remains operationally bounded; normal retention continues; recovery restores only unexpired data; live deletion and backup expiry are separately verified; deletion markers are reapplied after restore; only the content-free proof persists (`../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md:478-515`, `.memlog.md:84-85`, `EXPERIENCE.md:30`, `EXPERIENCE.md:72`, `EXPERIENCE.md:232-241`).
- **Audit-bound free text:** labels prohibit resident content, identifiers, and secrets; known product secrets are rejected with sanitized errors without adding general redaction workflow scope (`.memlog.md:86`, `EXPERIENCE.md:75`).
- **Manual AI validation:** it remains external, uses controlled non-real messages through ordinary product flows, and adds no special validation surface, persisted artifact, score, or formal report (`../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md:605-640`, `.memlog.md:87`, `EXPERIENCE.md:32`).

## Current findings

None.

No privacy/evidence behavior regressed, and no implementation-significant privacy/evidence omission or contradiction remains in the current MVP UX contract.

---
name: bmad-deepen-architecture
description: Scan a codebase for deepening opportunities (turning shallow modules into deep ones), present them as a visual HTML report with before/after diagrams, and grill through candidate decisions. Integrates with BMAD architecture, ADRs, and spec artifacts.
---

# BMad Deepen Architecture

## Overview

Surface architectural friction and propose **deepening opportunities**: refactors that turn shallow modules into deep ones. The objective is maximum testability, cognitive locality, and AI-navigability across any BMAD project codebase.

This workflow is grounded in clean module design principles:
- **Shared Architecture Vocabulary**: Strict adherence to core terms (**module**, **interface**, **implementation**, **depth**, **seam**, **adapter**, **leverage**, **locality**) and evaluation principles (**the deletion test**, **the interface is the test surface**). Refer to `references/vocabulary.md`.
- **BMAD Artifact Integration**: Dynamic discovery of domain language in `{project_context}` (`project-context.md` or `CONTEXT.md`), existing ADRs and architecture spines in `{planning_artifacts}`, and session memory tracking via BMAD `memlog.py`.
- **Visual-First Communication**: Delivery of actionable findings as a self-contained HTML report with before/after diagrams (Mermaid + hand-crafted SVG/divs), followed by an interactive grilling loop.

---

## Conventions

- Bare paths (e.g. `references/vocabulary.md`) resolve from `{skill-root}`.
- `{skill-root}` resolves to this skill's installed directory.
- `{project-root}` resolves to the project working directory.
- `{workflow.<name>}` resolves to fields in the merged `customize.toml` `[workflow]` table.
- `{planning_artifacts}` resolves to the configured BMAD planning artifacts directory (e.g. `{project-root}/_bmad-output/planning-artifacts`).
- `{output_folder}` resolves to the configured BMAD root output directory (e.g. `{project-root}/_bmad-output`).

---

## On Activation

### Step 1: Resolve Customization
Run: `python3 {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root} --key workflow`  
*(Or `uv run` if uv is available)*.

If the script fails, resolve the `workflow` block by reading in order:
1. `{skill-root}/customize.toml` (defaults)
2. `{project-root}/_bmad/custom/bmad-deepen-architecture.toml` (team overrides)
3. `{project-root}/_bmad/custom/bmad-deepen-architecture.user.toml` (personal overrides)

### Step 2: Execute Prepend Steps & Load Persistent Facts
Execute any entries in `{workflow.activation_steps_prepend}` in order.  
Load all entries in `{workflow.persistent_facts}` as foundational context. Entries prefixed with `file:` are paths or globs under `{project-root}` (e.g. `**/project-context.md`).

### Step 3: Load Config & Discover Project Artifacts
Load `{project-root}/_bmad/config.toml` or `{project-root}/_bmad/bmm/config.yaml` / `{project-root}/_bmad/core/config.yaml` and resolve:
- `project_name`, `planning_artifacts`, `implementation_artifacts`, `output_folder`
- `communication_language`, `document_output_language`, `user_name`
- `date` as system-generated current date
- `project_context` = glob `**/project-context.md` or `CONTEXT.md` (load domain glossary and architectural rules)
- `adrs` = scan `{planning_artifacts}/adr-*.md`, `{planning_artifacts}/architecture-*.md`, or `docs/adr/`

### Step 4: Persona Activation
Check whether a BMAD persona is already active in the session.
- If an agent persona is active, maintain that persona's voice throughout.
- Otherwise, adopt **Winston (System Architect)** by default: measured, trade-off oriented, developer-productivity focused.
- When drilling deep into code-level mechanics or automated tests during grilling, seamlessly summon or switch to **Amelia (Senior Dev)**.

### Step 5: Greet the User
Greet `{user_name}` in `{communication_language}` as Winston (or active persona). State that you are ready to scan the codebase for deepening opportunities or focus on a specific subsystem named by the user.

### Step 6: Execute Append Steps
Execute any entries in `{workflow.activation_steps_append}` in order.

---

## Workflow Execution

```
  ┌────────────────────────────────────────────────────────┐
  │ 1. EXPLORE & SCOPE                                      │
  │    - YAGNI scoping (hot spots via git log / user scope)│
  │    - Inspect domain glossary & existing ADRs            │
  │    - Subagent codebase sweep (shallow vs deep, seams)   │
  │    - Apply deletion test & calculate leverage/locality  │
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 2. VISUAL HTML REPORT                                  │
  │    - Generate report in OS temp directory               │
  │    - Tailwind + Mermaid + custom SVG before/after       │
  │    - Badges, Problem/Solution, Wins, Top Recommendation│
  │    - Open report via OS launcher & display path         │
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 3. INTERACTIVE GRILLING LOOP                           │
  │    - Initialize memlog in {deepen_output_path}/{slug}   │
  │    - Probe constraints, interfaces, and test survival   │
  │    - Side effects: update domain glossary / create ADR  │
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 4. BMAD DOWNSTREAM HANDOFFS                            │
  │    - Route to bmad-architecture, bmad-spec,            │
  │      bmad-create-story, or bmad-quick-dev              │
  └────────────────────────────────────────────────────────┘
```

---

## Phase 1: Explore & Scope

### 1.1 Scope Before Scanning (YAGNI)
Deepening a module pays off by reducing cognitive friction for future changes. Focus where change happens:
1. **User-Directed Scope**: If the user named a specific area, subsystem, or pain point, scope directly to it.
2. **Commit History Hot Spots**: If no scope is specified, inspect recent git history:
   ```bash
   git log --oneline -n 30 --stat
   ```
   Identify files and directories with high churn. If churn is scattered, expand the net to core application modules.

### 1.2 Context & ADR Ingestion
Before analyzing code, read:
- The project domain glossary in `{project_context}` (`project-context.md` or `CONTEXT.md`).
- Existing architecture decisions and ADRs in `{planning_artifacts}/` or `docs/adr/`.
- Maintain exact domain terms throughout the exploration.

### 1.3 Organic Codebase Sweep
Dispatch a read-only subagent or perform a systematic walk across the scoped modules. Look for architectural friction points:
- **Shallow Modules**: Where is an interface almost as complex as its implementation? (e.g. 5 methods exposing 5 internal database queries).
- **Broken Locality**: Where are pure functions or helpers split across multiple files, while the real coordination bugs hide at call sites?
- **Seam Leakage**: Where do modules leak internal types, ORM entities, or vendor SDK details across their seams?
- **Cognitive Bouncing**: Where does understanding a single business operation require navigating 4+ tiny intermediate wrapper modules?
- **Untestable Seams**: Where are modules difficult to test without extensive mocking of internal collaborators?

### 1.4 Apply the Deletion Test
For every suspected shallow module, apply the deletion test:
> *If we delete this module and absorb its logic directly into the core implementation, does it concentrate complexity into a single cohesive deep module, or scatter it?*  
> If it **concentrates complexity**, mark it as a candidate.

---

## Phase 2: Present Candidates as an HTML Report

### 2.1 File Generation in OS Temp Directory
Write a standalone, self-contained HTML file to the OS temp directory so that zero temporary review files pollute the repository:
- **Windows**: `%TEMP%\architecture-review-<timestamp>.html`
- **macOS / Linux**: `$TMPDIR/architecture-review-<timestamp>.html` or `/tmp/architecture-review-<timestamp>.html`

### 2.2 Styling & Visual Structure
Follow the structure defined in `references/html-report-scaffold.md`:
- **CDN Libraries**: Tailwind CSS CDN and Mermaid ESM import.
- **Header**: Project name, date, lead persona, and schematic legend.
- **Candidate Cards**: For each deepening opportunity, render:
  - **Title**: Short, naming the deepening action (e.g. *"Collapse Order Ingestion Pipeline"*).
  - **Badges**: Recommendation strength (`Strong` in emerald, `Worth exploring` in amber, `Speculative` in slate) and seam type (`in-process`, `local-substitutable`, `ports & adapters`, `mock`).
  - **Files**: Monospaced list of impacted files.
  - **Before / After Diagram**: Side-by-side visual comparison. Mix Mermaid sequence/flowcharts with hand-crafted SVG or CSS mass/cross-section diagrams.
  - **Problem & Solution**: Concise 1-sentence problem statement and 1-sentence solution statement.
  - **Architectural Wins**: Bullet points (≤6 words each) framed in terms of **locality**, **leverage**, **interface reduction**, and **test surface**.
  - **ADR Callout** (if applicable): Note any conflict with an existing ADR and why it is worth revisiting.
- **Top Recommendation**: Prominent card highlighting the #1 highest-leverage candidate to tackle first.

### 2.3 Open Report for User
Launch the report using the OS-appropriate command and inform the user of the absolute path:
- Windows: `start <absolute-path>`
- macOS: `open <absolute-path>`
- Linux: `xdg-open <absolute-path>`

Halt and ask the user:  
*"Which of these deepening opportunities would you like to explore?"*

---

## Phase 3: Interactive Grilling Loop

Once the user selects a candidate, enter the grilling loop (in the voice of Winston, switching to Amelia for dev mechanics):

### 3.1 Initialize Session Memory (Memlog)
Derive a kebab-case slug for the selected candidate and initialize session tracking:
```bash
python3 {project-root}/_bmad/scripts/memlog.py init --workspace {workflow.deepen_output_path}/{slug} --field scope="<candidate-title>" --field purpose="Deepen module architecture"
```

### 3.2 Grilling Decision Tree
Walk through the critical architectural branches one question at a time:
1. **Module Invariants & Responsibilities**: What exact invariants belong inside the deep module? What belongs outside?
2. **Interface Surface**: What is the minimal public interface? How many operations can be absorbed internally?
3. **Seam & Adapters**: What sits behind the seam? Is the seam justified by multiple adapters (e.g. test vs prod) or external I/O?
4. **Test Surface**: How do tests interact with the new interface? Can all mocks of intermediate layers be deleted?
5. **Breaking Changes & Blast Radius**: What call sites need migration? Can the transition be done incrementally?

Log each confirmed decision, constraint, and assumption:
```bash
python3 {project-root}/_bmad/scripts/memlog.py append --workspace {workflow.deepen_output_path}/{slug} --type decision --text "<decision-text>"
```

### 3.3 Manage Inline Side Effects
- **Domain Glossary Updates**: If a deepened module introduces or refines a domain concept, update `{project_context}` (`project-context.md` or `CONTEXT.md`) inline.
- **ADR Creation**: If the decision changes an established architectural precedent or rejects a candidate with load-bearing rationale, generate an ADR file in `{planning_artifacts}/adr-<number>-<slug>.md`.

---

## Phase 4: BMAD Downstream Handoffs

Once grilling is complete and decisions are crystallized in the memlog, offer clear next steps to the user:

1. **Architecture Spine Update (`bmad-architecture`)**: Incorporate the new module invariants and decisions into `ARCHITECTURE-SPINE.md`.
2. **Specification Distillation (`bmad-spec`)**: Formalize the deepened module contract into a machine-verifiable `SPEC.md`.
3. **Story Breakdown (`bmad-create-story` / `bmad-create-epics-and-stories`)**: Break the refactoring effort into manageable, testable user stories.
4. **Immediate Implementation (`bmad-quick-dev`)**: Implement the deepened module directly following test-first discipline.

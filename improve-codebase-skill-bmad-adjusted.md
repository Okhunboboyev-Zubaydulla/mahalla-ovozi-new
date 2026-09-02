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
---
# HTML Report Scaffold & Visual Patterns

The architectural review report is rendered as a single, self-contained HTML file written to the OS temp directory (`%TEMP%` on Windows, `$TMPDIR` or `/tmp` on Linux/macOS).

---

## 1. Complete HTML Scaffold

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Architecture Deepening Review - {{project_name}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      .seam { stroke-dasharray: 4 4; }
      .leak { stroke: #dc2626; stroke-width: 2px; }
      .deep-box { background: linear-gradient(135deg, #0f172a, #1e293b); color: #f8fafc; }
      .shallow-box { background: #f1f5f9; border: 1px dashed #94a3b8; }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans antialiased">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <!-- Header -->
      <header class="border-b border-stone-200 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span class="text-xs uppercase tracking-widest text-emerald-700 font-semibold">BMAD Architecture Deepening</span>
          <h1 class="text-3xl font-serif font-bold text-slate-900 mt-1">{{project_name}}</h1>
          <p class="text-xs text-slate-500 mt-1">Generated {{date}} &bull; Lead persona: {{persona_name}} ({{persona_title}})</p>
        </div>
        <!-- Compact Legend -->
        <div class="flex flex-wrap items-center gap-3 text-xs bg-white border border-stone-200 rounded-lg p-3 shadow-sm">
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-slate-800 inline-block"></span> Deep Module</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded border border-dashed border-slate-400 bg-slate-100 inline-block"></span> Shallow Module</span>
          <span class="flex items-center gap-1.5"><span class="w-4 border-t border-dashed border-slate-500 inline-block"></span> Seam</span>
          <span class="flex items-center gap-1.5"><span class="w-4 border-t-2 border-red-600 inline-block"></span> Leakage</span>
        </div>
      </header>

      <!-- Candidates List -->
      <section id="candidates" class="space-y-10">
        <!-- Candidate Cards Rendered Here -->
      </section>

      <!-- Top Recommendation -->
      <section id="top-recommendation" class="bg-slate-900 text-white rounded-2xl p-8 shadow-xl border border-slate-800 space-y-4">
        <!-- Top Recommendation Card -->
      </section>
    </main>
  </body>
</html>
```

---

## 2. Candidate Card Structure

Each candidate is encapsulated in a standalone `<article>` card:

```html
<article class="bg-white rounded-xl border border-stone-200 shadow-sm p-6 space-y-6" id="candidate-1">
  <!-- Title & Badges -->
  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-stone-100 pb-4">
    <div>
      <span class="text-xs font-mono uppercase text-slate-400">Opportunity #1</span>
      <h2 class="text-xl font-bold text-slate-900 font-serif">Collapse the Order Intake Pipeline</h2>
    </div>
    <div class="flex items-center gap-2">
      <!-- Recommendation Strength Badge -->
      <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Strong</span>
      <!-- Seam / Dependency Type Badge -->
      <span class="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">in-process</span>
    </div>
  </div>

  <!-- Impacted Files -->
  <div class="text-xs font-mono bg-stone-50 border border-stone-200 rounded p-2.5 text-slate-600 space-y-1">
    <div class="text-slate-400 font-sans uppercase font-bold text-[10px]">Impacted Modules & Files:</div>
    <div>&bull; packages/order/src/order-intake.ts</div>
    <div>&bull; packages/order/src/order-validator.ts</div>
    <div>&bull; packages/order/src/order-pipeline.ts</div>
  </div>

  <!-- Before / After Diagram Container -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- Before Column -->
    <div class="border border-stone-200 rounded-lg p-4 bg-stone-50 flex flex-col justify-between">
      <div class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Before: Shallow & Leaking</div>
      <div class="h-64 flex items-center justify-center">
        <!-- Diagram (Mermaid or Hand-built SVG) -->
      </div>
      <div class="text-xs text-slate-500 mt-2 italic">3 shallow layers, tests mock intermediate pipes</div>
    </div>

    <!-- After Column -->
    <div class="border border-stone-300 rounded-lg p-4 bg-white shadow-sm flex flex-col justify-between">
      <div class="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">After: Deep Module</div>
      <div class="h-64 flex items-center justify-center">
        <!-- Diagram (Mermaid or Hand-built SVG) -->
      </div>
      <div class="text-xs text-emerald-800 mt-2 font-medium">1 concise interface, full locality, zero leakage</div>
    </div>
  </div>

  <!-- Problem & Solution Statements -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
    <div>
      <span class="font-semibold text-slate-800">Problem:</span>
      <p class="text-slate-600 mt-0.5">Order validation logic leaks across three thin wrappers, forcing callers to coordinate pipeline steps.</p>
    </div>
    <div>
      <span class="font-semibold text-slate-800">Solution:</span>
      <p class="text-slate-600 mt-0.5">Absorb validation and stage progression inside a single deep order module with one ingestion operation.</p>
    </div>
  </div>

  <!-- Architectural Wins -->
  <div>
    <div class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Architectural Wins:</div>
    <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
      <li class="flex items-center gap-2"><span class="text-emerald-500 font-bold">&#10003;</span> Locality: validation bugs concentrate in one module</li>
      <li class="flex items-center gap-2"><span class="text-emerald-500 font-bold">&#10003;</span> Interface shrinks from 11 methods to 2</li>
      <li class="flex items-center gap-2"><span class="text-emerald-500 font-bold">&#10003;</span> Leverage: one interface handles all order channels</li>
      <li class="flex items-center gap-2"><span class="text-emerald-500 font-bold">&#10003;</span> Tests hit public interface without mocks</li>
    </ul>
  </div>

  <!-- Optional ADR Conflict Callout -->
  <!--
  <div class="bg-amber-50 border-l-4 border-amber-500 p-3 text-xs text-amber-900 rounded-r">
    <span class="font-bold">ADR Note:</span> Contradicts ADR-0004 pipeline design, but worth reopening due to high friction in multi-channel order validation.
  </div>
  -->
</article>
```

---

## 3. Diagram Patterns

Mix Mermaid graphs with hand-built HTML/SVG diagrams for maximum clarity:

### Pattern A: Mermaid Flowchart (Call Graphs & Leakages)
```html
<pre class="mermaid">
flowchart TD
  Caller[Client / Router] --> ShallowA[OrderValidator]
  ShallowA --> ShallowB[OrderTransformer]
  ShallowB --> ShallowC[OrderRepo]
  ShallowA -.leak.-> Ext[PricingClient]
  classDef leak stroke:#dc2626,stroke-width:2px,stroke-dasharray: 5 5;
  class Ext,ShallowA leak;
</pre>
```

### Pattern B: Mass Diagram (Interface vs Implementation Depth)
```html
<div class="w-full flex items-center justify-around h-48">
  <!-- Before: Shallow (Wide Interface, Thin Implementation) -->
  <div class="flex flex-col items-center w-36">
    <div class="w-full h-24 bg-red-100 border-2 border-red-400 rounded-t flex items-center justify-center text-[11px] font-mono text-red-900 text-center p-1 font-bold">
      Public Interface<br>(12 exposed methods)
    </div>
    <div class="w-full h-12 bg-slate-200 border-2 border-t-0 border-slate-400 rounded-b flex items-center justify-center text-[10px] text-slate-700">
      Implementation (Thin)
    </div>
    <span class="text-xs text-red-700 font-semibold mt-2">Shallow Module</span>
  </div>

  <!-- After: Deep (Narrow Interface, Thick Implementation) -->
  <div class="flex flex-col items-center w-36">
    <div class="w-full h-8 bg-emerald-100 border-2 border-emerald-500 rounded-t flex items-center justify-center text-[11px] font-mono text-emerald-900 font-bold">
      Interface (1 method)
    </div>
    <div class="w-full h-28 bg-slate-800 text-white border-2 border-t-0 border-slate-900 rounded-b flex items-center justify-center text-[10px] text-center p-2">
      Encapsulated Core Logic & Rules
    </div>
    <span class="text-xs text-emerald-700 font-semibold mt-2">Deep Module</span>
  </div>
</div>
```

### Pattern C: Cross-Section Diagram (Collapsing Layered Shallowness)
```html
<!-- Layer Collapse Visual -->
<div class="w-full space-y-1.5 p-2">
  <div class="h-7 border-l-4 border-slate-400 bg-slate-100 text-[10px] flex items-center px-2 font-mono text-slate-600">Controller Layer (Passthrough)</div>
  <div class="h-7 border-l-4 border-slate-400 bg-slate-100 text-[10px] flex items-center px-2 font-mono text-slate-600">Delegate Manager (Passthrough)</div>
  <div class="h-7 border-l-4 border-slate-400 bg-slate-100 text-[10px] flex items-center px-2 font-mono text-slate-600">Storage Wrapper (Passthrough)</div>
</div>
```
---
# Architecture Design Vocabulary & Principles

This reference defines the core vocabulary and evaluation principles used throughout the BMAD Architecture Deepening workflow. All candidate evaluations, diagrams, report texts, and grilling dialogues must adhere strictly to these definitions and terminology constraints.

---

## 1. Core Vocabulary

| Term | Definition |
| :--- | :--- |
| **Module** | A coherent unit of code with a well-defined public interface and a hidden implementation. |
| **Interface** | The public contract, types, and operations exposed by a module to its callers. The interface defines the test surface. |
| **Implementation** | The internal mechanisms, data structures, and private logic that execute behind the interface. |
| **Depth** | The ratio of internal capability and managed complexity to interface surface area. |
| **Deep Module** | A module whose interface is remarkably simple, concise, and stable compared to the substantial internal complexity it encapsulates. |
| **Shallow Module** | A module whose interface is nearly as complex as its implementation. Shallow modules leak cognitive load to callers. |
| **Seam** | A distinct boundary where two modules meet and can be cleanly decoupled, observed, or substituted. |
| **Adapter** | A translation bridge at a seam. *Rule of thumb: One adapter = hypothetical seam; two adapters = real justified seam.* |
| **Leverage** | The amplification ratio of a single concise interface managing broad invariants and serving multiple caller sites without leaking internals. |
| **Locality** | The degree to which related behavior, state mutations, and invariant enforcement reside in one place rather than being scattered across layers. |

---

## 2. Evaluation Principles

### The Deletion Test
When evaluating a suspected shallow module or intermediate layer, ask:
> *If we delete this module and absorb its logic into the caller or the core implementation, does it concentrate complexity into a single cohesive place, or merely scatter it?*
- If deleting it **concentrates complexity** into a deep module: **Consolidate / Deepen**.
- If deleting it **scatters complexity** across unrelated callers: Keep or reshape the seam.

### Interface as the Test Surface
The public interface is the only surface tests should touch. If tests require mocking internal collaborators, inspecting private state, or asserting against multi-layer passthrough wrappers, the module structure is too shallow and lacks locality.

### Seam Justification
Seams add indirection. A seam is justified when:
1. It has multiple real adapters (e.g., in-process test adapter vs production provider adapter).
2. It isolates a non-deterministic or external boundary (I/O, network, clock, storage).
3. It protects core domain invariants from infrastructure churn.

---

## 3. Strict Phrasing & Terminology Constraints

To preserve precision and prevent design ambiguity, use exact terms:

| Preferred Architectural Term | Forbidden Substitutions (Do NOT use) |
| :--- | :--- |
| **module** | component, service, unit, layer, wrapper (when referring to a module) |
| **interface** | API, method signature, contract (when referring to module interface) |
| **seam** | boundary, border, bridge (when referring to the decoupling point) |
| **deep / shallow** | fat / thin, heavy / light, large / small |
| **locality** | cohesion, closeness |
| **leverage** | reusability, abstraction power |

### Phrasing Patterns
- *"The order intake module is shallow: its interface is nearly as wide as its implementation."*
- *"Pricing logic leaks across the seam into peripheral handlers."*
- *"Deepen the module: collapse three passthrough layers into one clean interface with high locality."*
- *"Two adapters justify the seam: PostgreSQL storage in production, in-memory repository in automated tests."*
- *"Leverage: one concise interface protecting domain invariants across eight call sites."*
---
# DO NOT EDIT -- overwritten on every update.
#
# Workflow customization surface for bmad-deepen-architecture.
#
# Override files (not edited here):
#   {project-root}/_bmad/custom/bmad-deepen-architecture.toml        (team)
#   {project-root}/_bmad/custom/bmad-deepen-architecture.user.toml   (personal)

[workflow]

# --- Configurable below. Overrides merge per BMad structural rules: ---
#   scalars: override wins • arrays: append

# Steps to run before standard activation (config load, greet).
activation_steps_prepend = []

# Steps to run after greet but before scanning begins.
activation_steps_append = []

# Persistent facts the architecture reviewer keeps in mind for the whole run
# (domain constraints, tech stack rules, invariants). Loads project-context.md
# so the scan grounds in the project's real context without re-asking.
persistent_facts = [
  "file:{project-root}/**/project-context.md",
]

# Default lead persona for scanning and grilling sessions
default_persona = "bmad-agent-architect"

# Parent folder for persisted architecture deepening sessions and memlogs
deepen_output_path = "{output_folder}/deepen-architecture"

# Run folder naming pattern inside deepen_output_path
run_folder_pattern = "{slug}"

# Executed when a deepening candidate session completes. Empty for none.
on_complete = ""

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

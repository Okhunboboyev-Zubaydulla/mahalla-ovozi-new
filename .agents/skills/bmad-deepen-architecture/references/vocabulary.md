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

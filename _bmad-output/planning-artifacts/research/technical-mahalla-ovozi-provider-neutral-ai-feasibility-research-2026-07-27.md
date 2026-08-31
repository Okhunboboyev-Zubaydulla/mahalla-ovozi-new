---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - '_bmad-output/forge/mahalla-ovozi-mvp/forged-idea.md'
  - '_bmad-output/forge/mahalla-ovozi-mvp/adversarial-findings.md'
workflowType: 'research'
lastStep: 6
research_type: 'technical'
research_topic: 'Mahalla Ovozi provider-neutral AI capacity, latency, cost, and production feasibility'
research_goals: 'Validate a hosted-first production and local-development AI strategy for 20,000 messages per day, bursts of 100 messages per minute, all accepted same-day evidence context, and approximate 5-minute normal and 15-minute burst latency targets; define a centralized provider-neutral AI abstraction, evaluate affordable hosted and local models, quantify cost and privacy constraints, and identify suitable runtimes, queueing, concurrency, observability, controlled switching, and measurable test criteria.'
user_name: 'Zubaydulla'
date: '2026-07-27'
web_research_enabled: true
source_verification: true
---

# Research Report: Mahalla Ovozi Provider-Neutral AI Feasibility

**Date:** 2026-07-27
**Author:** Zubaydulla
**Research Type:** technical

---

## Research Overview

This research evaluates whether Mahalla Ovozi can process Telegram evidence with AI without requiring a production-grade local GPU workstation. It covers provider-neutral local and hosted inference, application and queue architecture, same-day evidence context, capacity, privacy, security, cost controls, testing, deployment, and phased adoption for a private three-to-four-district MVP.

The central conclusion is a hosted-first production architecture with local inference retained for free development and evaluation. All model access passes through a project-owned `AiGateway`, and immutable AI Profiles select evaluated adapters, models, prompts, schemas, privacy rules, and budgets. This keeps the application independent of any single vendor while preventing unsafe arbitrary provider switching.

The design is technically credible but production feasibility remains conditional. Representative Uzbek/Russian/code-mixed evaluations and a bounded pilot must prove semantic quality, same-day context size, token cost, provider eligibility, quotas, latency, recovery, and operator acceptance. The complete cross-section synthesis and decision gates appear in **Research Synthesis: Hosted-First, Provider-Neutral AI for Mahalla Ovozi** near the end of this report.

---

## Technical Research Scope Confirmation

**Research Topic:** Mahalla Ovozi provider-neutral AI capacity, latency, cost, and production feasibility
**Research Goals:** Validate a hosted-first production and local-development AI strategy for 20,000 messages per day, bursts of 100 messages per minute, all accepted same-day evidence context, and approximate 5-minute normal and 15-minute burst latency targets; define a centralized provider-neutral AI abstraction, evaluate affordable hosted and local models, quantify cost and privacy constraints, and identify suitable runtimes, queueing, concurrency, observability, controlled switching, and measurable test criteria.

**Technical Research Scope:**

- Architecture Analysis - design patterns, frameworks, system architecture
- Implementation Approaches - development methodologies, coding patterns
- Technology Stack - languages, frameworks, tools, platforms
- Integration Patterns - APIs, protocols, interoperability
- Performance Considerations - scalability, optimization, patterns

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-07-27

---

## Technology Stack Analysis

_Evidence snapshot: 2026-07-27. The repository is currently planning-only, so the following is a researched starting stack rather than a description of existing implementation._

### Programming Languages

**Recommended application language: TypeScript on Node.js 24 LTS.** Node.js lists version 24 as an LTS release and recommends supported LTS lines for production. TypeScript strict mode provides stronger compile-time correctness guarantees, which is valuable at Telegram, queue, AI-response, and tenant boundaries. Pin the exact Node.js 24 and TypeScript versions during implementation, along with explicit compiler settings; do not use a floating runtime or compiler version.

AI capability must sit behind a centralized TypeScript **AI Gateway**. The gateway owns provider selection, normalized requests and responses, schema validation, retries, timeout policy, token/cost telemetry, and provider-specific adapters. A provider may be a hosted API or a separately deployed local native/C++ or Python-backed runtime. Domain logic must not import a provider SDK directly.

_Popular language for this project:_ TypeScript for API, bot intake, workers, business rules, and operator UI.

_Specialized language/runtime:_ Optional Python or native C/C++ inside a local inference server; hosted providers remain external services behind adapters.

_Performance characteristic:_ The message rate is modest—20,000/day is about 0.23 messages/second on average and 100/minute is about 1.67 messages/second at burst rate. LLM prompt ingestion, generation, and context memory are the likely bottlenecks, not Node.js request handling.

_Confidence:_ High for the application-language and gateway-boundary choices; model/provider performance, cost, and quality remain unverified.
_Sources:_ [Node.js release status](https://nodejs.org/en/about/previous-releases), [TypeScript strict mode](https://www.typescriptlang.org/tsconfig/strict), [TypeScript compiler configuration guidance](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options)

### Development Frameworks and Libraries

**Recommended backend baseline:** a modular monolith using Fastify for HTTP/webhook endpoints, grammY for Telegram Bot API integration, and a separately runnable worker process. Fastify provides TypeScript support, schema-based request/response handling, and structured Pino logging. grammY is a TypeScript-first Telegram framework with current deployment and scaling guidance.

Telegram production intake should use a fast-acknowledging webhook that validates Telegram's secret header, persists a deduplication key based on `update_id`, enqueues work, and returns before AI processing. Telegram documents `update_id` as useful for deduplicating and restoring correct update order. Because Telegram is the intake channel, the deployment may keep AI and retained data local, but it cannot be fully air-gapped.

**Production direction: hosted-first, not hosted-only.** The owner does not currently have a production-grade local inference workstation. The MVP should therefore evaluate affordable hosted APIs as the primary production path while retaining local inference for development, low-cost experiments, offline evaluation where practical, and a possible future self-hosted option.

**Hosted model candidates for evaluation:**

- Economical nano/flash-lite class models from providers such as OpenAI and Google, plus other providers that meet the same capability and privacy gates.
- A stronger mid-tier model as a quality challenger and controlled fallback candidate.
- Hosted open-weight models only when their host supplies sufficient structured output, latency, availability, privacy, and cost controls.

An expensive frontier model is not a default requirement. Every candidate must pass the same representative Uzbek/Russian semantic-triage, Topic, attribution, cautious-summary, schema-validity, latency, and cost evaluation.

**Local model candidates for development and comparison:**

- **Qwen3-8B, non-thinking mode:** primary baseline candidate. Its official materials list Uzbek and Russian support, Apache 2.0 licensing, 32,768 native context, and support across Ollama, llama.cpp, vLLM, and SGLang.
- **Qwen3-14B:** quality challenger if the 8B model misses agreed evaluation thresholds.
- **Qwen3.5-9B:** exploratory challenger with a larger advertised context, but its newer serving requirements make it a higher-integration-risk baseline.

These are benchmark candidates, not an approved production model or a required production deployment.

**Inference runtime candidates:**

- **Ollama:** lowest-friction Windows development and pilot runtime, with partial OpenAI-compatible APIs and structured outputs. Its documentation states that parallelism multiplies allocated context memory and that overloaded queues can return HTTP 503.
- **llama.cpp / llama-server:** lightweight cross-platform runtime with quantized GGUF support, OpenAI-compatible endpoints, schema-constrained JSON, continuous batching, metrics, and parallel decoding.
- **vLLM:** production benchmark candidate for Linux/NVIDIA serving, batching, prefix caching, metrics, and multi-GPU scaling. It carries more deployment complexity than Ollama or llama.cpp.

Expose one versioned AI Gateway contract so hosted and local providers can be benchmarked without changing domain code.

**Versioned AI Profile:** provider, model identifier, endpoint mode, prompt version, schema version, generation settings, timeout policy, and relevant capability flags form one immutable profile version. Product Owner activation selects one approved profile for future processing. Every processing result records the profile version, provider, model, token usage, latency, and provider request ID. Switching does not rerun completed history.

**Switching boundary:** easy switching means selecting among previously evaluated and approved profiles. It must not mean arbitrary model selection. Provider differences in JSON Schema subsets, refusals, context limits, caching, rate limits, pricing, and data retention require adapter-level capability checks and evaluation gates.

**Locked product constraint:** Forge requires all raw accepted same-day evidence in the mahalla to be available as LLM context and explicitly rejects vector retrieval, old AI summaries, and a separate recent-message window. Embeddings or rolling summaries must not silently replace this context rule. If load testing shows the locked rule is infeasible, the report must surface that conflict for an explicit product decision.

_Major frameworks:_ Fastify, grammY, one AI Gateway, and separate provider adapters.

_UI option:_ React with Vite for the private operator dashboard; final component and interaction choices belong to UX and Architecture.

_Ecosystem maturity:_ High for Node.js/PostgreSQL/Docker; medium for the exact model/runtime combination until benchmarked.
_Sources:_ [Fastify documentation](https://fastify.dev/docs/latest/Reference/), [Fastify logging](https://fastify.dev/docs/latest/Reference/Logging/), [grammY deployment guidance](https://grammy.dev/advanced/deployment.html), [Telegram Bot API](https://core.telegram.org/bots/api), [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output), [Groq structured outputs](https://console.groq.com/docs/structured-outputs), [OpenAI API pricing](https://developers.openai.com/api/docs/pricing), [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing), [Qwen3 release](https://qwenlm.github.io/blog/qwen3/), [Qwen3-8B model card](https://huggingface.co/Qwen/Qwen3-8B), [Ollama concurrency](https://docs.ollama.com/faq), [llama-server documentation](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md), [vLLM serving documentation](https://docs.vllm.ai/en/latest/serving/data_parallel_deployment/)

### Database and Storage Technologies

**Recommended system of record: PostgreSQL.** The planned retained evidence envelope—approximately 180,000 messages—is modest for an indexed relational database. PostgreSQL supports transactional uniqueness for Telegram and processing idempotency keys, row-level security as defense-in-depth for district isolation, `jsonb` for flexible provider metadata, and built-in text-search functions for the locked plain-text historical search requirement.

Keep district identifiers, Telegram identifiers, timestamps, lifecycle state, and relationships in typed relational columns. Use `jsonb` only for flexible source metadata. Put `district_id` into every district-owned row and relevant composite unique key/index. Application authorization remains mandatory even if PostgreSQL row-level security is added.

**Recommended MVP queue candidate: PostgreSQL-backed jobs, evaluated with pg-boss.** PostgreSQL explicitly describes `SKIP LOCKED` as suitable for multiple consumers of a queue-like table. A PostgreSQL-backed queue minimizes stateful services and can enqueue ingestion work in the same database transaction as the intake record. Unique database constraints must remain the durable idempotency boundary; no queue should be treated as providing exactly-once external AI effects.

**Alternative when independent broker operations become justified:** RabbitMQ quorum queues. RabbitMQ provides replicated durable queues, publisher confirms, acknowledgements, prefetch, and dead-lettering, but introduces another stateful service. At this scale, raw throughput alone does not justify it. Strict per-district or per-chat ordering would still require explicit topology and worker rules.

**Not recommended as the default:** Redis/BullMQ or Redis Streams solely for this workload. They provide good Node.js ergonomics and consumer-group features, but add another durability configuration surface. Redis documentation also warns that multiple consumers can affect logical processing order. Add a cache only after measurements show a real need, and never make it the only copy of evidence, authorization state, or idempotency records.

**Object storage:** not required while retained evidence is text and metadata only. If binary evidence enters scope later, compare local filesystem plus PostgreSQL metadata against an S3-compatible service as a separate architecture decision.

_Relational database:_ PostgreSQL is the recommended baseline.

_NoSQL database:_ No current requirement. `jsonb` covers limited flexible Telegram metadata without introducing a second database.

_In-memory database:_ Optional later; not part of the baseline.

_Data warehouse:_ No MVP requirement. Operational reporting can use PostgreSQL until measured needs justify otherwise.

_Confidence:_ High for PostgreSQL sufficiency at the stated data scale; medium-high for PostgreSQL-backed queue fit until crash, retry, ordering, and load tests pass.
_Sources:_ [PostgreSQL queue-like `SKIP LOCKED` guidance](https://www.postgresql.org/docs/current/sql-select.html), [PostgreSQL `jsonb` indexing](https://www.postgresql.org/docs/17/datatype-json.html), [PostgreSQL text search](https://www.postgresql.org/docs/current/functions-textsearch.html), [PostgreSQL row-level security](https://www.postgresql.org/docs/18/ddl-rowsecurity.html), [pg-boss repository](https://github.com/timgit/pg-boss), [RabbitMQ quorum queues](https://www.rabbitmq.com/docs/quorum-queues), [Redis Streams](https://redis.io/docs/latest/develop/data-types/streams/)

### Development Tools and Platforms

Use a pnpm workspace with separate application entry points for API/bot intake, workers, and operator web UI, plus shared typed contracts. Keep them as one modular product and one repository rather than premature microservices.

**Recommended verification tools:**

- **Vitest** for domain, schema, worker, and integration tests.
- **Playwright** for the operator dashboard's critical flows.
- **Grafana k6** for webhook acceptance, normal traffic, burst, soak, worker restart, backlog recovery, and SLO threshold tests.
- Deterministic Telegram fixtures for duplicate and out-of-order updates, retries, worker crashes, timeouts, malformed AI output, and poison jobs.
- A separate Uzbek/Russian model-quality evaluation suite. Infrastructure load tests cannot prove semantic quality.

Pin exact package versions, runtime versions, model identifiers, container digests, and configuration versions. Standard delivery gates should include formatting/linting, strict type checking, focused tests, production builds, and target-hardware load tests before accepting capacity claims.

_IDE and editor:_ No product constraint; use repository-enforced formatting, linting, and type checks so correctness does not depend on one editor.

_Version control:_ Git, with generated and downloaded model artifacts excluded from source control.

_Build system:_ pnpm workspace scripts and reproducible container builds.

_Testing:_ Vitest, Playwright, k6, and model-quality fixtures.
_Sources:_ [Vitest guide](https://vitest.dev/guide/why.html), [Playwright best practices](https://playwright.dev/docs/best-practices), [k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)

### Cloud Infrastructure and Deployment

**Recommended production MVP deployment:** a private application host running the Node.js services, PostgreSQL, and observability stack through Docker Engine and Docker Compose, while the AI Gateway calls an approved hosted provider over TLS. A production GPU host is not a prerequisite.

Run the application API, worker, PostgreSQL, and observability services as separately health-checked containers or host-managed services with explicit persistent volumes. Expose only the TLS ingress. Pin images; do not deploy floating `latest` tags.

**Local development/evaluation:** use Ollama or llama.cpp on the owner's existing Windows PC when the selected model and context fit. Local tests may use a smaller or quantized model and must use synthetic, copied evaluation, or appropriately de-identified data rather than assuming production customer evidence may be placed on a personal machine.

**Optional future self-hosted GPU tiers to benchmark rather than purchase blindly:**

- **32 GB consumer GPU class:** minimum credible single-GPU production-pilot benchmark tier for an 8B quantized model with meaningful context and limited concurrency.
- **48 GB workstation GPU class:** recommended benchmark tier for additional context, batching, and concurrency headroom.
- **96 GB workstation/server GPU class:** high-headroom option only if evaluation selects a larger model or real context/concurrency measurements require it.

These tiers are research options, not purchase recommendations. Official model-weight sizes are only a lower bound. Runtime workspaces, KV cache, prompt length, parallel requests, and quantization all materially affect total VRAM. Ollama currently defaults to only 32K context at 24–48 GiB VRAM and documents higher memory use as context grows.

For hosted providers, the corresponding constraint becomes token cost, context-window limits, rate limits, provider latency, and privacy rather than local VRAM. The locked all-same-day-evidence rule remains a central capacity and cost test in both modes.

**Kubernetes:** defer. A single GPU host has no host-level high availability, and Kubernetes does not create redundancy that the hardware does not possess. Reconsider orchestration only for multiple GPU nodes, independent scaling, or a later high-availability requirement.

**Hosted AI privacy gate:** sending Telegram evidence to an AI provider is an external data transfer. Production selection requires documented training-use policy, retention period, zero-retention eligibility, data location/residency, contractual suitability, access controls, and customer disclosure. Free tiers must not be assumed suitable for production or private customer evidence. OpenAI documents no API training by default but standard abuse-monitoring retention for common endpoints unless eligible controls apply. Google documents no product-improvement use for paid Gemini services, while zero-retention behavior depends on endpoint and feature configuration. Groq documents configurable zero-data-retention controls and United States data location.

**Cloud/serverless/CDN:** general public-cloud hosting is not automatically required. Hosted AI is an approved candidate integration, subject to the privacy gate. Serverless application functions are still a poor fit for stateful queue workers and local model serving.

_Deployment baseline:_ Private application host with Docker Engine and Docker Compose; hosted AI provider for production candidate; optional Ollama/llama.cpp development runtime. NVIDIA Container Toolkit and DCGM are conditional on a future self-hosted GPU deployment.

_Observability:_ OpenTelemetry for application traces/metrics and Prometheus for numeric operational metrics and alerting. Record provider, model/profile version, token usage, estimated cost, rate-limit state, latency, and request IDs. Business/audit events remain in PostgreSQL because Prometheus is not an exact audit store.

_Material limitation:_ Telegram connectivity prevents a fully offline deployment.
_Sources:_ [Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/), [Docker Compose GPU support](https://docs.docker.com/compose/how-tos/gpu-support/), [Ollama context-length guidance](https://docs.ollama.com/context-length), [Prometheus overview](https://prometheus.io/docs/introduction/overview/), [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data), [Gemini zero-data-retention guidance](https://ai.google.dev/gemini-api/docs/zdr), [Groq data controls](https://console.groq.com/docs/your-data)

### Technology Adoption Trends

The relevant trend is separation through a stable domain contract rather than commitment to one provider or inference implementation. Hosted providers and local runtimes expose similar but not identical APIs. The application needs explicit adapters because nominal OpenAI compatibility does not normalize JSON Schema subsets, refusals, rate limits, token accounting, caching, retention, or errors.

For Mahalla Ovozi, adopt stable infrastructure conservatively and experiment at the inference boundary:

- Stable core: Node.js LTS, strict TypeScript, PostgreSQL, Docker Compose.
- Replaceable inference boundary: one AI Gateway with approved hosted and local provider adapters.
- Production default candidate: an affordable hosted model that passes quality, cost, latency, availability, and privacy gates.
- Development/evaluation candidate: Qwen3-8B or another suitable local model served through Ollama or llama.cpp when hardware permits.
- Measurement-led additions: stronger hosted fallback model, self-hosted GPU, separate broker, cache, object storage, multi-GPU serving, or Kubernetes only after evidence establishes the need.
- Rejected shortcut: replacing all raw accepted same-day evidence with vector retrieval or rolling AI summaries, because that conflicts with the hardened Forge rules.

_Migration pattern:_ begin with the smallest operational application stack and a hosted AI profile, preserve the provider-neutral gateway contract, and switch only among evaluated profile versions.

_Emerging technology:_ newer long-context models and serving optimizations are worth benchmarking but should not become untested commercial promises.

_Legacy risk:_ unsupported Node.js lines, unpinned model tags, and old container images create security and reproducibility risk.

_Community trend:_ hosted and local model serving increasingly standardize on HTTP APIs and structured outputs, but provider semantics still differ and advertised context windows still require workload-specific cost, latency, and quality validation.
_Confidence:_ High for the provider-neutral gateway and hosted-first production direction; medium for candidate provider/model ranking; low for final cost, throughput, and quality until representative evaluation and load tests are complete.

---

## Integration Patterns Analysis

_Evidence snapshot: 2026-07-27. These patterns preserve the Forge rule that accepted same-day raw evidence remains available to analysis while making hosted production AI and local development AI replaceable behind one controlled boundary._

### API Design Patterns

**Recommended external integration style: HTTPS webhooks and narrow REST/JSON APIs.** Telegram should call one authenticated webhook. The private operator UI can use conventional resource-oriented REST endpoints for messages, Topics, summaries, AI Profiles, and operational status. The MVP does not need a public general-purpose AI endpoint.

The Telegram webhook must perform only fast, durable intake:

```text
Telegram HTTPS webhook
  -> verify secret header and validate update
  -> PostgreSQL transaction
       insert unique update receipt
       store the minimum required candidate message data
       enqueue the next pipeline job
  -> commit
  -> return 2xx
```

The webhook must not wait for an LLM. Telegram retries unsuccessful webhook deliveries, supports a webhook secret header, and documents `update_id` as the identifier for ignoring repeated updates and restoring order. Return success only after durable commit; if persistence fails, return an error so Telegram can retry. Use a unique constraint on `(bot_id, update_id)`, not only a mutable “last seen ID,” because concurrent delivery may be out of order and Telegram may choose a random next ID after a long idle period.

**Recommended internal AI API: a project-owned TypeScript interface, initially in-process.** Application services depend only on a Mahalla Ovozi contract such as:

```ts
generateStructured<T>({
  operation,
  profileVersion,
  input,
  outputSchema,
  deadline,
  idempotencyKey,
}): Promise<AiResult<T>>
```

The implementation may use Vercel AI SDK Core's provider registry and first-party or OpenAI-compatible provider packages, but SDK types must not become domain contracts. The gateway owns profile resolution, capability checks, request construction, deadlines, retry policy, schema validation, normalized errors, usage/cost capture, and approved fallback selection. This keeps OpenAI, Gemini, Groq, Ollama, llama.cpp, or a future provider from leaking into pipeline logic.

`AiResult<T>` should return validated domain data plus the actual provider and model, immutable AI Profile version, provider request ID, normalized completion or refusal state, input/cached/output/reasoning token counts when available, latency, attempts, fallback reason, estimated cost, and pricing-snapshot version. Provider-native metadata may be retained in a protected audit field, but business code must use normalized fields.

**Provider-abstraction verdict:**

| Option | MVP verdict | Reason |
|---|---|---|
| Project-owned gateway over Vercel AI SDK Core | Use | TypeScript-native provider registry, typed structured-output support, and OpenAI-compatible local adapters reduce boilerplate while Mahalla retains its own contract and policy |
| Direct official SDK adapter for every provider | Valid escape hatch | Best access to provider-specific features, but duplicates normalization and retry work if used as the default |
| Self-hosted LiteLLM proxy | Defer | Strong centralized routing, virtual keys, budgets, and spend tracking, but adds a separately operated Python service and another data/failure boundary |
| Hosted Vercel AI Gateway | Optional adapter only | May simplify hosted routing, but is another external intermediary and does not replace the product-owned abstraction across private local and hosted providers |
| LangChain.js | Do not add now | Its broader agent, chain, and retrieval surface is unnecessary for a bounded classification and summarization pipeline |

The abstraction remains deliberately thin. Provider features and constraints are not truly identical, so each immutable AI Profile must declare capabilities such as strict structured output, context limit, usage reporting, caching, stable model version, non-thinking mode, privacy class, retention eligibility, rate quota, and approved operations. Reject an incompatible profile before making a call; never silently downgrade a required schema to prompt-only JSON.

_Sources:_ [Telegram `setWebhook`](https://core.telegram.org/bots/api#setwebhook), [Telegram Update](https://core.telegram.org/bots/api#update), [AI SDK provider registry](https://ai-sdk.dev/docs/reference/ai-sdk-core/provider-registry), [AI SDK provider management](https://ai-sdk.dev/docs/ai-sdk-core/provider-management), [AI SDK OpenAI-compatible providers](https://ai-sdk.dev/providers/openai-compatible-providers), [LiteLLM documentation](https://docs.litellm.ai/), [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)

### Communication Protocols

Use **HTTPS with JSON** at every current network boundary: Telegram-to-webhook, operator client-to-application API, and AI Gateway-to-hosted-provider API. Keep TLS certificate and hostname verification enabled. Prefer TLS 1.3 and permit TLS 1.2 only where a supported endpoint requires it.

Use **non-streaming AI responses** for background classification, Topic assignment, attribution, and summaries. Streaming supplies no useful user experience for these jobs and complicates partial JSON, cancellation, usage accounting, and validation. A future interactive feature may add streaming as a separate profile capability rather than changing the batch contract.

Do not expose a local Ollama endpoint directly to a public network. Its local API does not require authentication and defaults to loopback. If local inference later runs on another machine, place it behind an authenticated gateway or reverse proxy on a private network or VPN with TLS, firewall restrictions, and only the required routes.

**Protocols not justified for the MVP:**

- **GraphQL:** predictable private dashboard screens do not justify a second API schema and runtime.
- **gRPC/Protocol Buffers:** there is no demonstrated cross-language, high-volume internal RPC requirement in the modular TypeScript application.
- **WebSockets:** the Ops UI can poll initially; server-sent events may be considered later for one-way live status. WebSockets add connection state and the standard browser API does not provide backpressure.
- **Service mesh or enterprise service bus:** unnecessary for a few application processes deployed together.

_Sources:_ [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html), [Ollama authentication](https://docs.ollama.com/api/authentication), [Ollama FAQ](https://docs.ollama.com/faq), [GraphQL queries](https://graphql.org/learn/queries/), [gRPC core concepts](https://grpc.io/docs/what-is-grpc/core-concepts/), [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

### Data Formats and Standards

**Wire format:** UTF-8 JSON over HTTPS. Normalize Telegram and provider payloads at their adapters; never pass third-party payload objects directly into domain logic.

**AI input:** construct an allowlisted `AiInputEnvelope` rather than serializing database entities. Include the raw accepted message text required by Forge, the deterministic same-day evidence snapshot required for the operation, timestamps needed for meaning, stable request-scoped pseudonyms, prompt/schema/profile versions, and the operation contract. Remove transport metadata that is not needed for meaning, including Telegram bot credentials, phone numbers, usernames, internal database IDs, authentication data, and unrelated attachment metadata. Candidate messages needed for relevance classification require explicit short-lived handling; once classified irrelevant, discard their content according to the Forge rule.

**AI output:** define one canonical Zod domain schema and derive or maintain the provider-compatible JSON Schema representation. Validate every completed response in application code even when a provider promises constrained decoding. OpenAI, Gemini, Groq, and local OpenAI-compatible runtimes support different JSON Schema subsets and strictness levels; syntactic validity does not prove semantic correctness. Optional domain values may need portable nullable representations rather than provider-specific optional-field behavior.

**Persistence format:** store stable identifiers, tenancy/district keys, timestamps, lifecycle state, and result fields in typed relational columns. Use PostgreSQL `jsonb` only for bounded external metadata, normalized usage details, and raw provider metadata whose shape genuinely varies. Version the input-envelope contract, output schema, prompt, AI Profile, and pricing catalog independently so an audit can reconstruct what was sent, expected, and charged.

**Time and identifiers:** use UTC ISO 8601 timestamps at API boundaries and database-native timestamp types internally. Assign durable `ai_job_id` and unique `attempt_id` values. The business-result uniqueness key should combine operation, subject or evidence snapshot version, and AI Profile version. Preserve Telegram's original message timestamp separately from receipt and processing timestamps.

_Sources:_ [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output), [Groq structured outputs](https://console.groq.com/docs/structured-outputs), [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs), [llama.cpp server](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md), [AI SDK structured data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)

### System Interoperability Approaches

Use a **ports-and-adapters boundary** around changeable external systems:

```text
Telegram adapter -> intake application service -> durable PostgreSQL inbox/jobs
                                                -> analysis pipeline
                                                   -> Mahalla AI Gateway
                                                      -> hosted provider adapter
                                                      -> local runtime adapter
```

The system-of-record data model and domain operations remain provider-neutral. Provider adapters translate the canonical request into native options, map errors and refusals into a normalized taxonomy, expose raw usage/response metadata, and validate declared capabilities. Provider-specific options may exist inside an adapter or profile, but they must never become required domain fields.

Switching activates an already evaluated, immutable AI Profile for **future work only**. It does not rewrite completed results or automatically rerun history. A profile must be tested against the same representative Uzbek/Russian quality corpus, schema, latency, cost, and privacy gates. Nominal “OpenAI compatibility” is insufficient evidence because local and hosted implementations differ in schema support, parameters, usage fields, errors, and context accounting.

Calculate cost estimates from provider-reported usage plus a versioned pricing catalog. Store cached-input, reasoning, and output tokens separately where available and preserve the provider's request ID. Estimated application cost supports comparison and alerts; the provider invoice remains the billing source of truth.

Local development profiles should use synthetic, copied evaluation, or appropriately de-identified data unless production evidence is specifically approved for that environment. Production profiles must carry their data-classification and egress-policy approval. A provider change that alters retention or data location is an interoperability and privacy change, not a harmless configuration toggle.

_Sources:_ [AI SDK telemetry](https://ai-sdk.dev/docs/ai-sdk-core/telemetry), [OpenAI API data controls](https://developers.openai.com/api/docs/guides/your-data), [Gemini zero-data-retention guidance](https://ai.google.dev/gemini-api/docs/zdr), [Groq data controls](https://console.groq.com/docs/your-data), [Ollama usage](https://docs.ollama.com/api/usage)

### Microservices Integration Patterns

**Recommended topology: modular monolith plus separately runnable workers, not microservices.** Maintain explicit modules for Telegram intake, authorization/tenancy, evidence, Topics, analysis orchestration, AI Gateway, AI Profiles, audit/cost, and Ops. Deploy API/intake and worker entry points independently when useful, but keep one repository, one system of record, and ordinary in-process calls for domain collaboration.

This avoids distributed transactions, service discovery, network-versioned internal contracts, duplicated authentication, and operational overhead while still allowing AI worker concurrency to scale independently from webhook traffic. If a later measured need requires extracting the AI Gateway as a service, preserve the same application contract behind an authenticated internal REST API and use an idempotency key; do not begin with that network boundary.

**Deferred patterns:**

- **CQRS:** normal service methods and PostgreSQL read queries are sufficient at current complexity.
- **Event sourcing:** an immutable audit trail is useful, but full event replay, projections, and event-version evolution are unnecessary and risky for an MVP.
- **Saga orchestration:** no multi-service transaction currently exists. Queue state and compensating retry rules are enough.
- **API gateway/service mesh:** reconsider only after there are genuinely independent services, owners, or scaling/security policies.

A durable inbox, transactional outbox, and audit-event table do not make the application event-sourced.

_Sources:_ [Microsoft CQRS pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs), [Microsoft Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing), [Istio service-mesh overview](https://istio.io/latest/about/service-mesh/)

### Event-Driven Integration

Use PostgreSQL-backed asynchronous jobs to separate fast intake from slow and variable AI processing. For the MVP, evaluate pg-boss rather than operating a separate broker. It provides transactional job creation, PostgreSQL `SKIP LOCKED`-based claiming, retries, dead-letter handling, concurrency controls, and queue policies.

The required delivery model is **at-least-once processing with exactly-once business-result commitment**. Do not claim exactly-once hosted-AI invocation: a provider can finish and bill a request just before a network timeout or worker crash, after which a retry may invoke it again. Each attempt must therefore be durable and visible, while the final validated result is committed atomically only if the uniqueness key has no completed result.

Recommended job lifecycle:

```text
pending -> leased -> attempting -> validated -> committed
                  \-> retry -> leased
                  \-> dead_lettered
```

Claim jobs in a short transaction and commit the lease before making any network call. Never keep a database transaction open while waiting for an LLM. Expired leases return to retry; long calls send heartbeats. Bound retries by attempt count, queue deadline, job deadline, and cost budget. Dead-letter poison jobs for diagnosis and deliberate redrive.

Use a transactional inbox/outbox whenever intake also creates normalized business data so receipt, domain state, and the next job either commit together or not at all. `LISTEN/NOTIFY` may wake workers quickly, but polling the durable table must remain the recovery path.

Do not serialize the whole system. Use `chat_id` only where Telegram entity ordering matters, and `district_id` where shared district Topic or summary state requires serialization. Independent classification can run concurrently. District summaries should use a deterministic snapshot of all accepted same-day evidence, ordered by source time plus stable identifiers. A debounced district-refresh job may coalesce a burst and reduce hosted cost without dropping evidence.

**Backpressure:** enforce concurrency and request/token budgets per provider/model/profile. Reserve capacity for retries, defer low-priority jobs under pressure, and alert on queue age and predicted breach of the approximate five-minute normal or fifteen-minute burst target. Prefer controlled queue delay over an unapproved provider fallback.

_Sources:_ [PostgreSQL `SKIP LOCKED`](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE), [PostgreSQL WAL](https://www.postgresql.org/docs/current/wal-intro.html), [PostgreSQL `LISTEN`](https://www.postgresql.org/docs/current/sql-listen.html), [pg-boss documentation](https://timgit.github.io/pg-boss/), [AWS transactional outbox guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html), [RFC 9110 idempotent methods](https://www.rfc-editor.org/rfc/rfc9110.html#name-idempotent-methods)

### Integration Security Patterns

The centralized AI Gateway is also the **security and resilience boundary**. It owns credential retrieval, provider allowlisting, TLS policy, privacy filtering, egress authorization, deadlines, throttling, retries, circuit breakers, fallback authorization, output validation, and audit/cost telemetry.

**Secrets:** production configuration stores only a secret reference. Inject provider credentials server-side from a managed secret store; never expose them to the browser, database content, logs, error responses, analytics, or URLs. Separate development, staging, and production credentials; restrict providers/models and permissions where supported; configure project spend/rate limits and alerts. Rotate with overlap—create, deploy, verify, then revoke—and immediately revoke suspected compromised credentials. Audit credential lifecycle using a non-secret alias only.

**Telegram authentication:** configure `secret_token`, compare `X-Telegram-Bot-Api-Secret-Token` using a constant-time comparison, and keep the bot token out of webhook URLs and logs. TLS is mandatory. Telegram IP allowlisting may be defense-in-depth but must not be the only control because published address ranges can change.

**Privacy:** before any hosted call, apply an allowlisted input envelope and the selected profile's egress policy. Do not routinely log raw prompts, resident messages, or raw model responses. A fallback is forbidden when its provider's training-use, retention, zero-retention eligibility, data location, and contractual controls do not satisfy the job's data classification. If no approved route is available, defer and alert instead of silently exporting evidence elsewhere.

**Timeouts and cancellation:** maintain a latest-useful queue time, per-attempt deadline, and overall job deadline derived from the end-to-end target. Propagate cancellation to the SDK. Provider defaults must not silently exceed the product deadline.

**Retries:** designate exactly one retry owner so SDK and gateway retries do not multiply unexpectedly. Retry only transient connection failures, timeouts, `408`, `429`, and eligible `5xx` responses; honor `Retry-After`, otherwise use capped exponential backoff with full jitter. Do not transport-retry malformed requests, authentication failures, unsupported models, refusals, or deterministic schema/semantic validation failures. Structured-output repair is a separately measured model attempt.

**Circuit breaking:** maintain a breaker per provider/model/profile. Repeated eligible timeouts and `5xx` failures may open it; `429` primarily drives throttling until reset; `401` or `403` disables the route and alerts because retry cannot repair credentials. Bad local input or validation failures must not mark the provider globally unhealthy.

**Controlled fallback:** fallback only to an active, pre-evaluated AI Profile approved for the same operation, schema, data class, retention/location rules, remaining time, and cost budget. Record `fallback_from`, reason, and actual profile. Otherwise keep the job queued or dead-letter it for intervention.

**Audit event:** record job and attempt IDs, operation and district scope, provider/model/profile/prompt/schema versions, data class and egress-policy version, queue/start/end latency, status/error/circuit/fallback fields, provider request ID, available token categories, estimated cost and pricing version, validation status, final result state, and non-secret credential alias. Do not store secrets or raw resident content in operational telemetry.

_Confidence:_ High for the recommended integration boundaries and reliability patterns. Medium for concrete retry, deadline, concurrency, and circuit thresholds until provider sandboxes and representative load tests establish them. Provider retention, limits, pricing, and model behavior are changeable and must be revalidated during provider selection and before production launch.

_Sources:_ [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html), [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), [OWASP API4:2023 Unrestricted Resource Consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/), [OpenAI Node SDK retries and request IDs](https://github.com/openai/openai-node#retries), [Gemini troubleshooting](https://ai.google.dev/gemini-api/docs/troubleshooting), [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [Groq rate limits](https://console.groq.com/docs/rate-limits), [RFC 9110 `Retry-After`](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after), [Microsoft Circuit Breaker pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)

---

## Architectural Patterns and Design

_Evidence snapshot: 2026-07-27. The following is a target architecture for an MVP operated by a small team. It intentionally separates logical module boundaries from physical services so the system can remain simple now without trapping future provider or deployment choices._

### System Architecture Patterns

**Recommended architecture: a modular monolith using web–queue–worker and ports-and-adapters patterns.** Azure's architecture-style guidance identifies web–queue–worker as a suitable shape for a relatively simple domain with resource-intensive background work, while noting that microservices require autonomous services, data ownership, distributed consistency, and mature operations. Mahalla Ovozi needs the queue and worker separation because AI processing is slow and burst-sensitive, but it does not currently need independent domain services and databases.

```text
Internet
   |
TLS ingress
   |
   +-> Telegram webhook/API runtime
   |      |
   |      +-> PostgreSQL system of record + durable jobs
   |
Private operator web/API
          |
          +-> application modules -> PostgreSQL

Durable jobs -> bounded worker pool -> Mahalla AI Gateway
                                      +-> approved hosted AI API
                                      \-> local runtime in development

Application signals -> metrics, traces, structured logs, audit records
```

Use one codebase and one relational system of record, with three independently runnable roles built from shared modules:

1. **Ingress/API role:** authenticates Telegram and operators, performs short transactions, serves private reads/configuration, and never waits for AI.
2. **Worker role:** leases durable jobs, builds deterministic evidence snapshots, invokes the AI Gateway, validates responses, and commits results.
3. **Scheduler/maintenance role:** creates due refresh jobs, expires leases, applies retention, checks budgets, and performs operational reconciliation. It may initially run inside the worker process if failure isolation remains clear.

Recommended logical modules are Identity and Authorization, Telegram Intake, Evidence Lifecycle, Topic and Analysis, AI Orchestration, AI Gateway and Adapters, AI Profile Configuration, Audit and Cost, and Operator Operations. Modules may share one PostgreSQL database but must own their tables and expose behavior through typed application interfaces rather than importing another module's repository internals.

The architecture should be **asynchronous where latency is variable and synchronous where immediate consistency is useful**. AI analysis, summary refresh, and provider calls are jobs. Authorization, operator reads, profile validation, and short configuration changes remain ordinary request/response operations.

**Explicitly deferred:** microservices, serverless workers, Kubernetes, a separate message broker, event sourcing, service mesh, and multi-region active-active operation. Reconsider a physical service split only when one module needs independent scaling, security isolation, deployment cadence, or ownership that cannot be achieved with separate runtime roles.

_Sources:_ [Azure architecture styles](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/), [Azure cloud-native architecture planning](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/cloud-native/plan-cloud-native-solutions), [Azure event-driven architecture](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven), [AWS hexagonal architecture pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/hexagonal-architecture.html)

### Design Principles and Best Practices

Apply ports and adapters at **real change boundaries**, especially Telegram, PostgreSQL repositories, job execution, clocks/IDs, secret retrieval, telemetry, and AI providers. Keep business rules—district isolation, evidence acceptance, Topic lifecycle, attribution, summary rules, and future-only AI Profile activation—independent of frameworks and provider SDKs. This dependency direction makes the domain testable and allows a hosted adapter and local adapter to implement the same port.

Avoid ceremonial layers around stable, simple code. AWS's hexagonal-pattern guidance notes that adapter maintenance is justified when inputs or outputs genuinely vary; Mahalla's AI provider and Telegram boundaries meet that test, while every internal helper does not.

Architectural invariants:

- **One canonical domain vocabulary:** use the Forge terms consistently across schema, code, APIs, tests, and UI.
- **One source of truth:** PostgreSQL owns durable business state; queues, metrics, caches, and provider dashboards are projections or operational aids.
- **Immutable execution identity:** an AI Profile version combines provider, actual model policy, prompt, schema, generation settings, privacy/egress policy, timeouts, retries, and allowed fallbacks.
- **Future-only activation:** changing a profile affects work created after activation and never silently mutates or reprocesses completed history.
- **Deterministic context construction:** identical district/day/evidence revision/profile inputs produce the same ordered request envelope before nondeterministic model execution.
- **Validated boundaries:** validate Telegram input, operator commands, stored configuration, AI request capabilities, AI response schema, and rendered output.
- **Explicit failure states:** never convert missing evidence, context overflow, provider refusal, schema failure, timeout, or budget exhaustion into an apparently successful empty result.
- **Small transaction boundaries:** commit database state before external calls and never hold a transaction open while waiting for an LLM.

Use lightweight Architecture Decision Records for decisions with lasting consequences. Initial ADR candidates are: modular monolith and runtime roles; PostgreSQL-backed jobs; hosted-first/local-development AI; project-owned AI Gateway; immutable AI Profiles; same-day evidence snapshot contract; tenant/district isolation; retention and external-AI egress; and the production database hosting choice.

_Sources:_ [AWS hexagonal architecture pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/hexagonal-architecture.html), [AWS guidance for adapting ports and adapters](https://docs.aws.amazon.com/prescriptive-guidance/latest/hexagonal-architectures/adapt-to-change.html), [Azure microservice-boundary guidance](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/microservice-boundaries), [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)

### Scalability and Performance Patterns

Scale the **bottleneck**, not every layer. At 100 incoming messages per minute, the webhook/API rate is small for Node.js and PostgreSQL; AI latency, prompt size, token quotas, and cost are the uncertain capacity limits.

Use queue-based load leveling so a burst does not become an uncontrolled burst of provider calls. Scale worker concurrency horizontally only within explicit per-profile request-per-minute, token-per-minute, spend, database-connection, and job-deadline budgets. The approximate concurrency required for one AI call per message is:

```text
required concurrency ~= burst arrivals/second × average provider seconds/call
```

At 1.67 messages/second, a ten-second call needs roughly 17 concurrent slots to keep pace; a thirty-second call needs roughly 50. If the pipeline makes multiple calls per message, multiply accordingly. These are planning relationships, not capacity claims: real values require the representative load and quality evaluation.

Apply the following patterns:

- **Competing consumers:** multiple workers may process independent jobs in parallel.
- **Partitioned ordering:** serialize only operations that share a `chat_id` or mutable `district_id` state; do not impose global ordering.
- **Bulkheads:** maintain separate concurrency pools/circuit state per provider/model/profile so one degraded route cannot consume every worker or database connection.
- **Backpressure:** stop leasing more work when provider, token, cost, or deadline budgets are exhausted; let the durable queue absorb the burst.
- **Coalescing:** debounce redundant district-summary refresh requests and compute one result from the latest committed snapshot, without removing any accepted evidence.
- **Bounded retries and dead letters:** prevent poison jobs or unavailable providers from creating retry storms.

Use queue age and predicted deadline breach—not CPU alone—as the principal worker-scaling signals. Track normal and burst cohorts separately. Scale the stateless ingress/API role horizontally only if measured traffic or availability needs require it. Scale PostgreSQL vertically and tune indexes/connections first; the stated evidence volume does not justify sharding.

The locked same-day-context rule creates a growing daily input. The context builder must count provider-specific tokens before dispatch and emit an explicit `context_limit_exceeded` or budget failure rather than truncating, switching to retrieval, or silently summarizing. Provider prompt caching may reduce repeated-prefix cost and latency only when the exact evidence remains present and the provider's retention/privacy behavior is approved.

_Sources:_ [Azure Queue-Based Load Leveling pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling), [Azure Competing Consumers pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/competing-consumers), [Azure Bulkhead pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead), [Azure background-job guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/background-jobs)

### Integration and Communication Patterns

Use **commands for intent, jobs for asynchronous work, and domain events only where another module genuinely needs notification**. Avoid turning every state transition into a public event stream. A mediated pipeline state machine is easier to reason about than uncontrolled choreography for the MVP.

Recommended flow:

```text
ReceiveUpdate
  -> persist receipt/candidate + enqueue TriageMessage
  -> TriageMessage validates relevance
       -> irrelevant: discard content and record minimum non-content outcome
       -> accepted: persist evidence + enqueue affected analysis/refresh work
  -> Build deterministic same-day district evidence snapshot
  -> Analyze through approved AI Profile
  -> validate and atomically commit the result
  -> expose result to authorized Ops queries
```

Every asynchronous contract needs a schema version, idempotency key, district scope, creation/deadline timestamps, attempt policy, and correlation IDs. Jobs should carry identifiers and immutable version references rather than copying large resident-message bodies into queue payloads. Workers load authorized data from PostgreSQL at execution time and verify that the expected evidence revision still applies.

Adapters form anti-corruption layers: Telegram concepts are normalized into Mahalla commands, and hosted/local provider concepts are normalized into `AiResult`. Provider-specific error codes, token categories, and response fields remain inside adapters and audit metadata.

Use transactional inbox/outbox boundaries for state plus job creation. A publisher/subscriber broker is unnecessary until multiple independently deployed consumers need the same durable event. If that need appears later, publish a minimal, versioned event without resident content by default.

_Sources:_ [Azure event-driven architecture](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven), [Azure cloud design patterns](https://learn.microsoft.com/en-us/azure/architecture/patterns/), [AWS transactional outbox guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html), [Azure Anti-Corruption Layer pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer)

### Security Architecture Patterns

Create and maintain a data-flow threat model with explicit trust boundaries at Telegram, the public ingress, operator authentication, database roles, hosted-AI egress, secret retrieval, observability export, and any future local-inference host. OWASP recommends modeling data flows, stores, actors, and trust boundaries early and revisiting the model as the design changes.

**District/tenant isolation:** derive district scope from authenticated server-side membership; never trust a client-supplied district identifier by itself. Carry validated scope through commands, jobs, queries, cache keys, logs, and audit events. Enforce application authorization on every object access and use PostgreSQL row-level security as defense-in-depth. Use composite uniqueness and indexes that include `district_id` where ownership is district-scoped.

**Least privilege by runtime role:** ingress may create receipts/jobs but must not read all evidence; the worker may read required evidence and write analysis results but must not administer users or retrieve plaintext credentials; the operator API reads only authorized districts and activates profiles through an audited command; migrations and backup use separate credentials. Provider keys exist only in the AI Gateway runtime.

**LLM as an untrusted computation boundary:** resident Telegram messages are untrusted data and may contain prompt-injection instructions. Structure prompts to distinguish instructions from evidence, but do not treat prompting as a complete security control. The model receives no database credentials, arbitrary network access, shell access, or autonomous tools. It returns schema-constrained data that application code validates; authorization and business mutations always remain deterministic server-side code. Never place secrets or enforceable authorization rules only in a system prompt.

**Privacy and containment:** encrypt network traffic, restrict database/backup access, minimize provider payloads, and prevent raw evidence from entering routine logs, metrics, traces, or error trackers. Each production AI Profile must be approved for its data class and egress destination. A privacy-ineligible fallback is not a fallback.

**Availability protections:** rate-limit public and operator endpoints, cap payload sizes and AI token budgets, isolate provider concurrency, use circuit breakers, and expose separate liveness and readiness signals without leaking sensitive dependency details. Keep a documented kill switch that disables new hosted-AI dispatch while preserving durable intake.

_Sources:_ [OWASP Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html), [OWASP Multi-Tenant Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html), [OWASP LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html), [OWASP LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/), [Azure Health Endpoint Monitoring pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/health-endpoint-monitoring)

### Data Architecture Patterns

Use PostgreSQL as the authoritative store for normalized domain state, durable jobs, lifecycle timestamps, and audit lineage. A practical logical model includes:

- `telegram_update_receipts`: deduplication and intake status with minimum necessary source metadata.
- `candidate_messages`: short-lived content awaiting relevance triage.
- `accepted_evidence`: retained raw accepted content, district scope, source identity, source time, and lifecycle state.
- Topic, attribution, and summary tables with explicit current revision and lineage.
- `ai_jobs` and `ai_attempts`: leases, retries, deadlines, provider calls, errors, and cost/usage.
- `ai_results`: validated immutable execution output linked to evidence snapshot and AI Profile versions.
- `ai_profiles`, prompt/schema versions, egress policies, and pricing snapshots.
- `audit_events`: append-oriented business/configuration history without raw resident content.

Do not use one unstructured JSON document as the business model. Relational constraints should enforce identifiers, ownership, state transitions, and deduplication; `jsonb` is reserved for bounded source/provider metadata.

**Same-day evidence snapshot:** for every operation governed by the Forge rule, record the district, local reporting day definition, ordered accepted-evidence IDs and revisions, source-time range, item count, token count, and a content hash. The model request includes every raw accepted item in deterministic source-time/stable-ID order. If messages are edited or newly accepted, create a new snapshot revision; do not mutate the identity of the earlier execution.

Completed AI results remain immutable execution records. A correction, human override, or regenerated future result creates a new revision linked to its predecessor and reason. The UI may project the current accepted state, while audit queries preserve lineage.

Retention is a lifecycle policy, not an ad hoc cleanup query. Candidate irrelevant content is purged immediately after classification; accepted evidence follows the approved evidence-retention rule; provider attempt metadata and audits have their own minimized retention. Deletion jobs must be idempotent and auditable without preserving the deleted content itself.

Use normal indexes and query plans before partitioning. Candidate indexes include district plus source time, Telegram chat/message identity, update receipt uniqueness, job status plus `available_at`, and current Topic/summary lookups. Introduce table partitioning only after measured maintenance or query needs justify it.

Backups must be encrypted, access-controlled, retained separately from the primary host, and regularly restore-tested. For a small database, logical dumps are simple; point-in-time recovery through base backups plus archived WAL becomes appropriate when the recovery-point objective requires it.

_Sources:_ [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html), [PostgreSQL indexes](https://www.postgresql.org/docs/current/indexes.html), [PostgreSQL SQL dumps](https://www.postgresql.org/docs/current/backup-dump.html), [PostgreSQL continuous archiving and PITR](https://www.postgresql.org/docs/current/continuous-archiving.html)

### Deployment and Operations Architecture

**Development:** run the application and PostgreSQL locally through Compose, with an Ollama or llama.cpp profile when the owner's hardware can support the chosen test. Use deterministic fixtures and de-identified/synthetic evaluation content. Developers may also select a restricted hosted sandbox profile through the same gateway contract, with separate credentials and hard spend limits.

**Production MVP:** use an affordable Linux VPS or equivalent private application host with a public TLS ingress and private application network. Run ingress/API, worker, scheduler/maintenance, PostgreSQL, and observability as separately health-checked containers or managed services. The worker calls one approved hosted-AI profile; the production design has no GPU requirement.

Docker documents Compose as a supported single-server deployment approach and recommends production-specific configuration, restart policies, and logging. Compose starts containers when dependencies are running, not necessarily ready, so define health checks and readiness-aware dependencies. Pin image digests or immutable versions, use read-only filesystems and dropped Linux capabilities where practical, persist only required volumes, and set CPU/memory/process limits.

Treat single-host deployment as a deliberate MVP availability trade-off and document it in an ADR. It is the cheapest operational shape but remains a single failure domain. Before promising customer availability, define recovery-time and recovery-point objectives, off-host backups, restore procedures, and how long Telegram/update and AI backlogs can safely wait. Managed PostgreSQL is the preferred later risk-reduction step when customer commitments justify its recurring cost; the application architecture must not depend on provider-specific database features.

Operational controls:

- Independent liveness, readiness, and dependency-health views.
- Graceful shutdown: stop leasing, finish or safely release jobs, then close HTTP and database connections.
- Automated migrations as a separately authorized deployment step with backup/rollback planning.
- Structured logs, OpenTelemetry traces/metrics, and Prometheus alerts correlated by update, job, attempt, district, and profile—without raw content.
- Alerts for webhook failure, queue age/depth, stale leases, dead letters, provider throttling/circuit state, context overflow, schema failures, latency SLO risk, token/cost budget, disk/database health, backup failure, and certificate/secret expiry.
- Restore drills and worker-crash/provider-outage exercises before production acceptance.

OpenTelemetry's generative-AI conventions remain evolving and warn that several content attributes may be sensitive. Use stable general HTTP/database/messaging conventions where available, add a small versioned Mahalla AI attribute set, and disable prompt/response capture by default.

_Confidence:_ High for the modular-monolith, web–queue–worker, ports/adapters, PostgreSQL, and hosted-first topology. Medium for single-server Compose as a production pilot because availability expectations are not yet defined. Low for final worker counts, provider quotas, context feasibility, and monthly cost until representative evaluation and load testing are complete.

_Sources:_ [Docker Compose in production](https://docs.docker.com/compose/how-tos/production/), [Docker Compose startup/readiness](https://docs.docker.com/compose/how-tos/startup-order/), [Docker Compose service controls](https://docs.docker.com/reference/compose-file/services/), [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/specs/semconv/), [OpenTelemetry generative-AI attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/), [OpenTelemetry JavaScript instrumentation](https://opentelemetry.io/docs/zero-code/js/), [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)

---

## Implementation Approaches and Technology Adoption

_Evidence snapshot: 2026-07-29. Implementation recommendations assume a planning-only repository, a novice solo founder using AI-assisted development, and explicit human approval for production privacy, provider, cost, and availability decisions._

### Technology Adoption Strategies

Adopt the architecture through **small, reversible vertical slices**. Do not begin by implementing every provider, queue policy, and observability feature. First prove the domain contract and durable workflow with controlled test doubles, then add one local and one hosted route behind the same gateway.

Recommended adoption sequence:

1. Lock the domain operations, canonical input/output schemas, AI Profile lifecycle, and representative Uzbek/Russian evaluation corpus.
2. Implement Telegram intake, persistence, idempotency, and jobs with a deterministic fake AI provider.
3. Add one local OpenAI-compatible adapter for development and offline comparison.
4. Add one economical hosted adapter in a non-production environment, including privacy controls and cost telemetry.
5. Compare approved candidates through the same application-native evaluation harness.
6. Activate a hosted profile for a controlled pilot only after quality, privacy, context, latency, quota, and budget gates pass.
7. Add another provider only when it supplies a tested fallback, commercial leverage, or a capability the first route cannot provide.

Use Vercel AI SDK 6 as an internal TypeScript implementation library, pinned with compatible provider packages. Its provider registry and structured output APIs reduce adapter boilerplate, but the Mahalla AiGateway interface, AI Profile state machine, domain schemas, cost calculation, error taxonomy, and fallback authorization remain project-owned. This allows a later direct SDK adapter or proxy without changing domain services.

AI Profile lifecycle:

    draft -> validated -> evaluated -> approved -> active -> retired

Validation proves configuration and declared capabilities. Evaluation proves task quality, schema conformance, latency, token use, and cost on a locked dataset. Approval records the human decision and privacy/egress authorization. Activation changes future jobs only. Retirement prevents new use but preserves historical references.

Do not use floating model aliases such as latest for production. Pin a stable provider model snapshot when offered. Treat any provider, model, prompt, schema, generation setting, context-construction, or privacy-policy change as a new profile version requiring proportionate reevaluation.

Promptfoo is a useful optional local-first evaluation and red-team runner because it supports hosted providers, Ollama, custom HTTP/JavaScript providers, assertions, machine-readable output, and CI integration. It should call the application gateway or a thin application-native evaluation adapter so tests exercise the real prompt and context builder. Promptfoo configuration must not become a second production prompt source of truth, and its version must be pinned rather than invoked through latest in reproducible workflows.

_Sources:_ [AI SDK provider management](https://ai-sdk.dev/docs/ai-sdk-core/provider-management), [AI SDK structured data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data), [Promptfoo providers](https://www.promptfoo.dev/docs/providers/), [Promptfoo Ollama provider](https://www.promptfoo.dev/docs/providers/ollama/), [Promptfoo CI/CD integration](https://www.promptfoo.dev/docs/integrations/ci-cd/)

### Development Workflows and Tooling

Use a pnpm workspace without over-splitting the codebase. A suitable starting layout is:

    apps/
      server/       API, webhook, worker and maintenance composition roots
      web/          private operator interface
    packages/
      contracts/    intentionally shared external/API schemas only
      test-support/ deterministic fixtures, builders and fake adapters
    evals/           versioned datasets, rubrics, scenarios and reports
    infra/           Compose and environment-specific deployment definitions

Inside the server application, organize by domain modules—identity, intake, evidence, Topics, analysis, AI profiles, audit/cost, and Ops—rather than by global controller/service/repository folders. Keep provider adapters under the AI infrastructure boundary. Add workspace packages only when they have a genuine independent consumer or boundary.

Create separate composition roots for API and worker processes. A Fastify application factory should build the app without listening so route tests can use injection and production startup can own signals and shutdown. Validate request and response schemas, use structured Pino logging with redaction, and resolve infrastructure dependencies at startup rather than through hidden global singletons.

Separate configuration into:

- **Static deployment configuration:** ports, database URL/secret reference, telemetry endpoint, environment name, and enabled runtime roles. Validate once at startup and fail clearly.
- **Dynamic governed configuration:** immutable AI Profiles, prompt/schema versions, budgets, approved fallbacks, and activation records in PostgreSQL.
- **Secrets:** provider credentials and Telegram/database secrets injected from an external secret facility; the database stores only non-secret aliases or references.

Recommended pull-request workflow:

1. Small scoped change linked to a requirement, ADR, or story.
2. Frozen-lockfile install.
3. Formatting/linting and strict TypeScript checks.
4. Unit and PostgreSQL integration tests.
5. Production builds and migration/schema verification.
6. Focused security/dependency checks.
7. Human review of product, privacy, cost, and architectural changes.

Run deterministic tests on every pull request. Run paid live-provider evaluations manually or on a controlled schedule with explicit credentials, concurrency limits, dataset size, and spending caps. Store only minimized evaluation artifacts and never upload production evidence to public CI.

GitHub Actions supports Node.js build/test workflows and pnpm caching. Give workflows minimum permissions, protect production environments, require review for deployment, and avoid exposing provider secrets to untrusted pull-request code. Enable available secret scanning/push protection, dependency review, Dependabot, and CodeQL features according to repository visibility and GitHub plan.

_Sources:_ [Fastify TypeScript reference](https://fastify.dev/docs/latest/Reference/TypeScript/), [Fastify validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/), [Fastify testing](https://fastify.dev/docs/latest/Guides/Testing/), [GitHub Actions Node.js guidance](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs), [GitHub dependency review](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review), [GitHub secret scanning](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning)

### Testing and Quality Assurance

Use a layered test strategy in which each layer answers a different question:

- **Unit tests:** pure domain rules, state transitions, evidence ordering, token/cost calculations, profile selection, authorization decisions, and error classification.
- **Schema/contract tests:** Telegram adapter payloads, AiGateway input/output, every provider adapter, and persisted event/job versions.
- **PostgreSQL integration tests:** migrations, constraints, row-level security, transactions, inbox/outbox behavior, job leasing, lease expiry, retries, and idempotent commits against a real disposable PostgreSQL instance through Testcontainers.
- **Worker failure tests:** crash before provider call, timeout after possible provider completion, crash before result commit, stale heartbeat, poison message, dead-letter/redrive, and profile retirement during queued work.
- **API integration tests:** Fastify injection for authentication, validation, district scope, idempotency, and health behavior.
- **Browser tests:** Playwright for the smallest set of critical operator journeys, using isolated test data and user-visible assertions.
- **Load/reliability tests:** k6 normal, burst, spike, soak, provider throttling, worker restart, and backlog-recovery scenarios with explicit pass/fail thresholds.
- **Security tests:** cross-district access, secret/log redaction, prompt injection, malicious Markdown/URLs, oversized inputs, rate limiting, and unauthorized profile activation.
- **Recovery tests:** automated backup checks plus scheduled restore drills on a clean environment.

Build the AI evaluation corpus from human-reviewed Uzbek, Russian, and code-mixed examples covering relevant and irrelevant messages, ambiguity, duplicates, edits, attribution, Topic boundaries, cautious summaries, long same-day context, and adversarial instructions embedded in resident text. Preserve the locked input, expected labels/rubrics, dataset version, profile version, random/settings state, raw normalized metrics, and evaluator identity.

Separate deterministic gates from judgment gates:

- JSON/schema validity and required fields are deterministic and must be 100% for committed results.
- Classification precision, recall, F1, attribution, and subgroup differences compare against human labels.
- Summary groundedness, material omission, caution, and usefulness use a documented human rubric.
- Model-as-judge scores may help scale review only after calibration against human ratings; they must not be the sole production gate.
- Repeat a sample of cases to measure nondeterministic variance.

Run infrastructure load tests first with a controllable fake provider so they isolate webhook, queue, worker, and database capacity. Then run a bounded hosted-provider test to measure real latency, quotas, tokens, caching, and cost. Never launch the full 20,000-message scenario against a paid provider without an explicit budget and stop condition.

Vitest provides V8-based coverage, but coverage percentage is diagnostic rather than proof of behavior. Prioritize critical paths and boundary cases. Playwright recommends isolated tests and user-visible assertions. k6 thresholds convert latency/error/SLO criteria into non-zero CI failures.

_Sources:_ [Vitest coverage](https://vitest.dev/guide/coverage), [Testcontainers PostgreSQL](https://node.testcontainers.org/modules/postgresql/), [Playwright best practices](https://playwright.dev/docs/best-practices), [k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/), [Google model-evaluation guidance](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/evaluate-judge-model)

### Deployment and Operations Practices

Build one immutable server image that can start as API, worker, or maintenance role. Build the web application separately. Tag releases with a version and commit identifier, pin production images, and keep deployment configuration versioned. Use a production Compose overlay for the single-server pilot; introduce Terraform or another provisioning tool only when repeated cloud resources make manual setup unreliable.

Recommended release flow:

1. Build and scan immutable artifacts in CI.
2. Back up and verify available disk/capacity.
3. Apply an additive or backward-compatible database migration as an explicit step.
4. Start/restart services and wait for readiness.
5. Run webhook, database, queue, authentication, and fake/sandbox AI smoke tests.
6. Observe error, queue, latency, and cost signals before activating a new AI Profile.
7. Roll back the application image independently when possible; use expand-contract migrations so rollback is not blocked by destructive schema changes.

Provider/model rollout is separate from application deployment. Evaluate a draft profile, approve it, optionally run it in offline shadow evaluation, then activate it for future jobs. Rollback reactivates the prior approved profile for new jobs; it never rewrites completed history.

Operational runbooks are required for Telegram webhook failure, hosted-provider outage/throttling, credential compromise/rotation, cost spike, context overflow, queue backlog, poison jobs, disk pressure, database restore, and disabling hosted-AI egress. Keep one kill switch that stops new external AI dispatch while durable intake continues.

Monitor user-relevant outcomes rather than component uptime alone: webhook acceptance, oldest queue age, normal/burst completion latency, dead-letter count, profile/provider success, schema failures, context overflow, tokens and cost, district-scope denials, backup age, and restore readiness. Alerts must be actionable and must not include raw resident text.

A solo operator needs a short incident template: start time, impact, affected districts/operations, current profile/provider, last safe change, mitigation, recovery evidence, and follow-up actions. Significant data loss, unauthorized exposure, prolonged outage, cost runaway, or monitoring failure should trigger a blameless post-incident review.

_Sources:_ [Docker Compose production guidance](https://docs.docker.com/compose/how-tos/production/), [Docker Compose startup/readiness](https://docs.docker.com/compose/how-tos/startup-order/), [Google SRE monitoring guidance](https://sre.google/sre-book/monitoring-distributed-systems/), [Google SRE incident management](https://sre.google/sre-book/managing-incidents/), [Google SRE postmortem culture](https://sre.google/sre-book/postmortem-culture/)

### Team Organization and Skills

The MVP does not need separate platform, ML, security, and SRE teams. It does need those responsibilities to be explicit even when one founder and AI agents perform most execution.

**Human owner responsibilities:** approve product semantics, resident-data handling, provider/data-location/retention choices, spending limits, production activation, customer disclosure, and incident decisions. AI agents may research, implement, test, and review, but must not self-approve material privacy, security, cost, or production changes.

**Implementation competencies:** strict TypeScript/Node.js, Fastify request lifecycle, PostgreSQL transactions/constraints/indexes/RLS, durable job semantics, Telegram webhook behavior, Docker/Linux basics, hosted-AI API behavior, structured outputs, evaluation design, observability, secrets, backups, and incident response.

Use checklists and independent review passes to compensate for a one-person team. For security/privacy terms or customer contractual commitments, obtain qualified external advice before production rather than treating generated research as legal approval.

Keep operational documentation beginner-friendly: one-page local setup, deployment, provider activation/rollback, backup/restore, key rotation, and incident runbooks. Each procedure should state prerequisites, exact verification evidence, and safe rollback.

_Sources:_ [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html), [Google SRE responsibilities](https://sre.google/sre-book/introduction/), [OWASP Threat Modeling](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html)

### Cost Optimization and Resource Management

Hosted-first production avoids immediate GPU capital cost and lets capacity scale through an API quota, but it turns same-day context into a recurring token expense. The cost model must be measured from the real context builder:

    monthly estimated cost =
      sum(input_tokens × input_rate
        + cached_input_tokens × cached_rate
        + output_tokens × output_rate
        + reasoning_tokens × applicable_rate
        + storage/feature charges)

Track cost per received message, accepted message, AI operation, district/day, profile, provider, and 1,000 processed messages. Reconcile application estimates with provider billing; the provider invoice remains authoritative.

As of this snapshot, published economical examples include GPT-5.4 nano at USD 0.20 per million input tokens and USD 1.25 per million output tokens, and Gemini 3.1 Flash-Lite at USD 0.25 input and USD 1.50 output. These prices are changeable and do not establish the final provider. Quality, retention, regional suitability, quotas, and the actual repeated-context token distribution remain decisive.

Cost controls:

- Preflight provider-specific token counts before dispatch.
- Enforce per-job, daily, monthly, environment, provider, and profile budgets.
- Stop or defer dispatch before a hard budget is exceeded; never rely only on a delayed billing alert.
- Debounce/coalesce redundant district refresh work while preserving every accepted evidence item.
- Keep output schemas concise and disable unnecessary reasoning/tools.
- Use an economical approved profile by default and a stronger model only through an explicit evaluated policy.
- Separate development, evaluation, staging, and production credentials and budgets.
- Record pricing-catalog versions and alert when observed invoice rates diverge.

Prompt caching can materially reduce repeated-prefix cost, but it is provider-specific and may create stored cache content or retention charges. A cache may be used only when the exact same-day evidence remains in context, the hit/miss behavior is measured, and the AI Profile's privacy/egress approval covers the provider's caching mode and TTL. For example, Gemini documents implicit caching and separately notes that explicit cached content is stored for its configured lifetime; an absolute zero-data-footprint configuration must avoid explicit caching.

Batch pricing is not a default fit for the approximate five- and fifteen-minute targets because batch services trade latency for price. Evaluate only provider modes whose documented completion behavior meets the product deadline.

_Sources:_ [OpenAI GPT-5.4 nano pricing](https://developers.openai.com/api/docs/models/gpt-5.4-nano), [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini context caching](https://ai.google.dev/gemini-api/docs/caching), [Gemini zero-data-retention guidance](https://ai.google.dev/gemini-api/docs/zdr), [OWASP API resource-consumption controls](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/)

### Risk Assessment and Mitigation

| Risk | Impact | Required mitigation and exit evidence |
|---|---|---|
| Same-day context exceeds model limit or budget | Analysis cannot meet the locked product rule | Token preflight across real day-size distributions; explicit overflow state; no truncation; escalate the product conflict with measurements |
| Hosted transfer violates privacy expectations | Resident data exposure or contractual failure | Approved data classification, minimization, retention/ZDR/location review, credentials and logging controls, customer disclosure, and tested egress kill switch |
| Economical model misses Uzbek/Russian semantics | Incorrect triage, Topics, attribution, or summaries | Locked human-reviewed corpus, subgroup metrics, calibrated rubric, stronger challenger, and explicit approval thresholds |
| Provider/model behavior changes | Silent quality or schema regression | Pinned snapshots, immutable profiles, scheduled reevaluation, adapter contract tests, and no latest alias in production |
| Retries duplicate provider calls/cost | Conflicting results and unexpected bills | Durable attempt ledger, bounded single-owner retry policy, unique committed-result key, crash tests, and invoice reconciliation |
| Queue or worker loses/blocks work | Missed latency targets or lost evidence | Transactional intake/jobs, leases/heartbeats, dead letters, poison-job tests, queue-age alerts, and manual redrive |
| Cost grows with repeated evidence context | Commercially infeasible operation | Token/cost telemetry, scenario calculator, coalescing, approved caching only, budgets, and pilot cost gate |
| Prompt injection in Telegram content | Manipulated output or leakage | Treat evidence as data, no LLM tools/credentials, structured output validation, adversarial corpus, and deterministic authorization |
| Single-host production failure | Temporary full outage or data loss | Off-host backups, restore drills, defined RPO/RTO, documented rebuild, and later managed database/HA decision |
| Solo-operator knowledge bottleneck | Slow or unsafe recovery | Minimal runbooks, tested drills, configuration/audit history, and external support path for material incidents |
| Dependency/supply-chain compromise | Application or credential compromise | Pinned lockfile/images, dependency review, secret scanning, CodeQL where available, controlled updates, and least-privilege CI |

The highest unresolved feasibility risks are same-day context growth, semantic quality on representative local-language evidence, hosted-data eligibility, real provider quotas/latency, and monthly cost. Architecture alone cannot close them; only the evaluation and pilot gates can.

## Technical Research Recommendations

### Implementation Roadmap

| Increment | Deliverable | Exit gate |
|---|---|---|
| 0. Decisions and evaluation foundation | ADRs, domain contracts, AI schemas, profile lifecycle, versioned evaluation corpus and cost calculator | Human approval of privacy questions, quality metrics, and measurement method |
| 1. Durable intake spine | Fastify/grammY webhook, PostgreSQL migrations, update dedupe, candidate lifecycle, durable jobs, fake provider | Duplicate/out-of-order/crash tests pass; webhook acknowledges only after commit |
| 2. Deterministic analysis spine | Evidence snapshot builder, operation state machine, AiGateway port, fake adapter, result lineage | Same input creates identical envelope/hash; invalid output never commits |
| 3. Local development route | OpenAI-compatible Ollama/llama.cpp adapter and local evaluation workflow | Works on available hardware with documented limits; no production claim |
| 4. Hosted candidate route | One hosted adapter, secrets, privacy envelope, usage/cost ledger, quotas, retry/circuit policy | Sandbox evaluation passes initial schema, privacy, quality, latency, and cost gates |
| 5. Product analysis slice | Relevance triage, Topics, attribution, cautious summary and authorized Ops display | End-to-end fixtures and human quality review pass without cross-district leakage |
| 6. Production hardening | Health/telemetry, budgets, alerts, backup/restore, incident runbooks, provider outage and load tests | Normal/burst targets and failure drills pass on production-shaped infrastructure |
| 7. Controlled pilot | Approved production profile and limited authorized district rollout | Measured quality, cost, backlog, privacy, and operator usability accepted before expansion |

Do not purchase GPU hardware or deploy a second provider, broker, cache, Kubernetes, or microservices during these increments unless a failed measurable gate proves it is necessary.

### Technology Stack Recommendations

- **Runtime:** Node.js 24 LTS and strict TypeScript, exact versions pinned during implementation.
- **Workspace:** pnpm with a small apps/packages structure and frozen lockfile.
- **HTTP and Telegram:** Fastify plus grammY.
- **Validation/contracts:** Zod as the canonical application/AI schema layer, with provider-compatible JSON Schema generation and adapter checks.
- **Database and jobs:** a currently supported PostgreSQL release; evaluate pg-boss for transactional PostgreSQL-backed jobs.
- **AI boundary:** project-owned AiGateway implemented initially with Vercel AI SDK 6, official provider packages, and the OpenAI-compatible provider for local runtimes.
- **Local inference:** Ollama first for Windows development; llama.cpp as a lower-level comparison.
- **Hosted inference:** one economical stable model selected only through the common evaluation/privacy/cost gate; retain a stronger approved challenger.
- **Testing:** Vitest, Testcontainers, Playwright, k6, and an application-native AI evaluation harness; Promptfoo optional for matrix/report/red-team support.
- **Observability:** Pino structured logs, OpenTelemetry traces/metrics, Prometheus/Grafana, and PostgreSQL audit/cost records.
- **Deployment:** Docker Engine and Compose for development and the single-server pilot; public TLS ingress and private internal network.

Final dependency identities and versions belong in Architecture/implementation after compatibility verification. Do not copy floating latest commands from documentation into reproducible production configuration.

### Skill Development Requirements

Prioritize learning in this order:

1. PostgreSQL transactions, constraints, indexes, migrations, row-level security, backups, and restore.
2. TypeScript domain modeling, runtime validation, Fastify lifecycle, and dependency boundaries.
3. Durable jobs, leases, idempotency, retries, deadlines, and failure recovery.
4. LLM structured outputs, context/token accounting, provider differences, and evaluation design.
5. Privacy-aware logging, secrets, authentication/authorization, and threat modeling.
6. Docker/Linux deployment, health checks, observability, incident response, and cost operations.

The owner does not need to become an ML researcher or GPU operator for the hosted-first MVP. The essential capability is running evidence-based evaluations and safely operating a data-sensitive asynchronous application.

### Success Metrics and KPIs

**Data integrity and security**

- Zero lost accepted updates in duplicate, retry, restart, and lease-expiry tests.
- Zero duplicate committed business results for one operation/evidence/profile uniqueness key.
- Zero successful cross-district access in automated authorization and row-level-security tests.
- Zero secrets or raw resident content in routine logs, traces, metrics, CI artifacts, or error payloads.
- 100% of profile activations and sensitive operator actions have actor, time, old/new version, and reason audit records.

**AI quality and reproducibility**

- 100% of committed AI results pass the canonical schema; invalid/refused/overflow outcomes remain explicit failures.
- Relevant-message precision/recall, Topic/attribution metrics, and summary rubric thresholds are agreed before production and pass on a locked, human-reviewed Uzbek/Russian/code-mixed corpus.
- Every result links to provider, actual model, AI Profile, prompt, schema, evidence snapshot, and attempt metadata.
- Profile switching produces no automatic rerun or mutation of completed history.

**Performance and capacity**

- Webhook persistence/acknowledgment target: p95 below one second under normal and 100/minute burst intake.
- Recommended operational interpretation to confirm: at least p95 of relevant results complete within approximately five minutes in normal traffic and burst backlog work within approximately fifteen minutes.
- Queue age, provider latency, context tokens, throughput, and backlog drain remain within tested limits at the 20,000-message/day design envelope.
- Context overflow rate is zero at the accepted design percentile or is surfaced as an explicit unresolved product constraint before launch.

**Cost and operations**

- Estimated and billed cost are visible per profile, operation, district/day, and 1,000 messages; production activation requires an owner-approved monthly scenario and hard budget.
- No unapproved provider/fallback receives production evidence.
- Backup completion is monitored, and a clean-environment restore drill meets the approved RPO/RTO before production.
- Provider outage, rate-limit, credential-rotation, cost-kill-switch, dead-letter, and application rollback drills have documented successful evidence.

Thresholds that encode product tolerance—especially semantic false negatives, summary errors, monthly budget, RPO/RTO, and availability—remain explicit approval decisions for PRD/Architecture rather than assumptions hidden in code.

---

# Research Synthesis: Hosted-First, Provider-Neutral AI for Mahalla Ovozi

## Executive Summary

Mahalla Ovozi does not need a production-grade local AI workstation to reach production. The recommended design runs the private application, PostgreSQL data, durable jobs, audit history, and backups on controlled infrastructure while sending only approved AI workloads to an economical hosted model. Local Ollama or llama.cpp remains valuable for free development, offline evaluation, adapter testing, and emergency comparison, but local hardware capacity is not a launch dependency.

The architectural center is a project-owned `AiGateway`, not a vendor SDK. Every local or hosted provider is implemented as an adapter behind the same typed request and result contract. An immutable, versioned AI Profile records the approved provider, pinned model, prompt, output schema, inference settings, privacy policy, retry/fallback policy, and cost limits. Activating a profile affects future jobs only; it never silently rewrites completed analysis. Provider choice therefore becomes a controlled operational decision rather than application-wide code change.

This direction is feasible but not yet production-proven. The largest uncertainty is the locked same-day evidence rule: repeated context may dominate tokens, latency, and cost as the day grows. Other material gates are Uzbek/Russian/code-mixed quality, hosted-data eligibility and retention, actual project quotas, provider failure behavior, monthly cost, and single-host recovery. Architecture reduces these risks; only a representative evaluation corpus, production-shaped load tests, and a bounded district pilot can close them.

**Key technical findings**

- The application workload is modest relative to AI inference; model calls and repeated evidence context are the primary capacity and cost constraints.
- A modular monolith with separate API, worker, and maintenance roles is simpler and sufficient for the MVP.
- PostgreSQL can be both the system of record and the durable job foundation, subject to a proof of pg-boss behavior under crash, lease, retry, and redrive tests.
- “OpenAI-compatible” is a useful transport shortcut, not a complete provider contract. Ollama documents compatibility with only parts of the OpenAI API, so each adapter needs capability and behavior tests.
- Hosted low-cost models make the business direction plausible, but advertised context windows and token prices do not prove the full-day workload is affordable or accurate.
- “Not used for training” and “zero data retention” are different controls. Caching, grounding, file, stateful, and abuse-monitoring features require separate review.

**Top recommendations**

1. Build durable Telegram intake, the operation state machine, and a fake AI adapter before integrating a paid model.
2. Lock the human-reviewed Uzbek/Russian/code-mixed evaluation corpus and acceptance metrics before choosing the production model.
3. Implement one local adapter and one hosted adapter through the same `AiGateway`; add another provider only after evidence shows a real need.
4. Measure exact input/output tokens and cost against realistic same-day evidence distributions, with a hard test budget and stop condition.
5. Require explicit human approval for provider privacy, retention, data location, customer disclosure, monthly budget, and production profile activation.
6. Pilot with one authorized district and expand only after quality, privacy, cost, latency, recovery, and operator gates pass.

## Table of Contents

1. [Technical Research Introduction and Methodology](#1-technical-research-introduction-and-methodology)
2. [Technical Landscape and Architecture Analysis](#2-technical-landscape-and-architecture-analysis)
3. [Implementation Approaches and Best Practices](#3-implementation-approaches-and-best-practices)
4. [Technology Stack Evolution and Current Trends](#4-technology-stack-evolution-and-current-trends)
5. [Integration and Interoperability Patterns](#5-integration-and-interoperability-patterns)
6. [Performance and Scalability Analysis](#6-performance-and-scalability-analysis)
7. [Security, Privacy, and Governance](#7-security-privacy-and-governance)
8. [Strategic Technical Recommendations](#8-strategic-technical-recommendations)
9. [Implementation Roadmap and Risk Assessment](#9-implementation-roadmap-and-risk-assessment)
10. [Future Technical Outlook and Innovation Opportunities](#10-future-technical-outlook-and-innovation-opportunities)
11. [Technical Research Methodology and Source Verification](#11-technical-research-methodology-and-source-verification)
12. [Technical Appendices and Decision Gates](#12-technical-appendices-and-decision-gates)

## 1. Technical Research Introduction and Methodology

### Technical Significance

Mahalla Ovozi combines private resident evidence, asynchronous Telegram intake, growing daily context, semantic triage, Topic attribution, and cautious summaries. A superficially simple “call an LLM” integration would couple business behavior to one provider and hide consequential differences in schemas, retention, quotas, retries, cost, and model drift. The research therefore treats AI as a versioned, failure-prone external dependency inside a data-sensitive system.

The business significance is equally direct: hosted inference avoids premature GPU capital cost and specialist operations, while a local development route preserves inexpensive experimentation. Provider neutrality protects future choice, but only when it is implemented as an owned domain contract with tested adapters and governed profile activation—not as arbitrary runtime switching.

### Methodology

- **Scope:** local and hosted inference, provider abstraction, stack selection, ingestion, jobs, evidence context, capacity, privacy, security, observability, testing, deployment, operations, and cost.
- **Evidence:** official vendor documentation, maintained project documentation, established security/reliability guidance, and locked Forge product decisions.
- **Analysis:** compare requirements against provider capabilities and failure modes; distinguish architectural conclusions from claims that require benchmark or legal validation.
- **Research period:** 27–30 July 2026, with current-source refresh on 30 July 2026.
- **Limit:** this checkout is planning-only; no live provider benchmark, production privacy approval, or district pilot was performed.

## 2. Technical Landscape and Architecture Analysis

The recommended topology is a modular TypeScript application deployed in separate runtime roles:

```text
Telegram -> API/webhook -> PostgreSQL transaction -> durable queue
                                                  -> worker
                                                  -> AiGateway
                                                     |- local adapter
                                                     `- hosted adapter
                                                  -> validated result + lineage
                                                  -> authorized dashboard
```

The webhook performs validation, deduplication, persistence, and transactional enqueue before returning success. It never waits for an LLM. Workers claim durable operations, assemble the exact evidence snapshot, call the gateway, validate structured output, and commit one uniquely keyed business result. At-least-once job execution is acceptable; exactly-once business-result commitment is the required invariant.

The design preserves a single cohesive codebase while isolating domain rules, persistence, Telegram transport, AI adapters, authorization, and operations. Separate services or infrastructure should appear only after a measured constraint—not as an MVP assumption.

## 3. Implementation Approaches and Best Practices

Implementation should advance through independently testable vertical increments. The first increment proves durable intake with a fake provider. The second proves deterministic context and result lineage. Local and hosted adapters follow only after the contract and evaluation harness exist.

Important implementation rules are:

- Validate every AI response against the canonical application schema.
- Store the actual provider, model, profile, prompt, schema, evidence snapshot, request identifier, token usage, and attempt metadata with each result.
- Use bounded retries only for classified transient failures and keep one retry owner.
- Never let the LLM access tools, credentials, authorization decisions, or the database directly.
- Treat provider activation and application deployment as separate release events.
- Use additive database migrations, readiness checks, smoke tests, rollback procedures, and an external-AI kill switch.

Testing combines Vitest for domain and contract behavior, Testcontainers for PostgreSQL semantics, Playwright for authorized user flows, k6 for capacity thresholds, and an application-native evaluation harness for semantic quality. Paid evaluations run manually or on a controlled schedule with explicit budgets, not on every pull request.

## 4. Technology Stack Evolution and Current Trends

The recommended implementation baseline remains Node.js 24 LTS with strict TypeScript and pnpm. Node.js lists version 24 as LTS and recommends supported LTS lines for production applications. Fastify, grammY, Zod, PostgreSQL, pg-boss evaluation, Vercel AI SDK 6 below the owned gateway, Pino, OpenTelemetry, Prometheus/Grafana, Docker Engine, and Docker Compose form a coherent MVP stack.

Model catalogs, aliases, quotas, pricing, and retention features change faster than application architecture. Production must pin model snapshots where available and record catalog/pricing versions in AI Profiles and cost calculations. As of the final refresh, GPT-5.4 nano lists a 400,000-token context window, structured outputs, a stable snapshot, USD 0.20 per million input tokens, and USD 1.25 per million output tokens. Gemini 3.1 Flash-Lite lists USD 0.25 input and USD 1.50 output, but Google also exposes newer and differently priced model families. These figures are candidate-screening inputs only.

_Sources:_ [Node.js releases](https://nodejs.org/en/about/previous-releases), [OpenAI GPT-5.4 nano](https://developers.openai.com/api/docs/models/gpt-5.4-nano), [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)

## 5. Integration and Interoperability Patterns

The `AiGateway` owns one canonical request envelope and a discriminated result union such as `success`, `refused`, `invalid_output`, `context_overflow`, `rate_limited`, `timeout`, and `provider_error`. Adapters translate this contract to provider-specific payloads and normalize usage, identifiers, errors, and structured outputs back into application types.

Each adapter must declare and test a capability matrix:

| Capability | Why it matters |
|---|---|
| Structured output/schema subset | Determines whether the canonical result can be enforced |
| Context and output limits | Establishes hard dispatch and overflow boundaries |
| Stable model snapshot | Controls silent behavior drift |
| Token accounting | Enables preflight and invoice reconciliation |
| Rate-limit semantics | Drives queue scheduling and retry timing |
| Retention/ZDR/data location | Determines whether resident evidence may be sent |
| Caching behavior and TTL | Affects privacy, cost, and repeated context |
| Request identifiers/errors | Supports diagnosis and safe retry classification |

Ollama’s partial OpenAI compatibility makes a local adapter easier, but does not remove the need for explicit capability validation. The application must not depend on a provider-specific “latest” alias or SDK type outside its adapter.

_Source:_ [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility)

## 6. Performance and Scalability Analysis

The locked design envelope is up to four districts, 120 groups, approximately 20,000 structurally valid human text messages per day, and short bursts around 100 messages per minute. A 100/minute burst is about 1.67 messages per second. If every message caused one provider call, approximate in-flight concurrency would be about 17 at 10 seconds per call or 50 at 30 seconds per call. Actual concurrency depends on triage, coalescing, operation frequency, context size, provider latency, and quota.

The most consequential performance variable is not the raw message rate; it is how often growing same-day evidence is resent. A large advertised context window is only a maximum request boundary. It does not prove acceptable price, latency, attention quality, or quota consumption. Before production, measure token distributions by district and time of day, preflight each request, and explicitly fail rather than silently truncate when the locked context rule cannot be met.

The operational targets remain approximately five minutes for relevant results under normal traffic and fifteen minutes to drain short burst backlogs, with p95 interpretation requiring product approval. Measure webhook acknowledgment, queue age, provider latency, context/output tokens, operation throughput, failures, and cost independently.

Gemini documents project- and tier-dependent limits and warns that actual capacity may vary. The final provider account must therefore be load-tested at its real tier; documentation alone cannot establish available production capacity.

_Source:_ [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)

## 7. Security, Privacy, and Governance

Resident Telegram evidence is untrusted external input and becomes an external data transfer when sent to a hosted model. Keep the source data, audit logs, and backups on controlled infrastructure; minimize every hosted payload; encrypt transport; isolate credentials; prohibit raw prompt/response logging; and enforce district authorization outside the LLM.

Provider approval must separately examine training use, abuse-monitoring logs, retention, caching, files, grounding, stateful APIs, data location, subprocessors, deletion, and contractual/customer disclosure. Google’s Gemini documentation illustrates the distinction: paid prompts are not used to improve products, while absolute zero-footprint use still requires approved ZDR controls and avoidance or configuration of features that retain data, including explicit caching and stateful features.

Prompt injection is handled structurally: resident content is delimited as data, cannot supply system instructions, has no tools or credentials, and can only produce schema-validated proposals. Deterministic code remains responsible for identity, authorization, persistence, state transitions, and audit.

_Sources:_ [Gemini zero data retention](https://ai.google.dev/gemini-api/docs/zdr), [OWASP LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)

## 8. Strategic Technical Recommendations

Adopt hosted-first production, local-first development, and optional future self-hosting. This is a routing strategy, not a promise that every provider is interchangeable. The production route may activate only an evaluated profile that passes quality, privacy, latency, quota, cost, and operational gates.

Do not buy GPU hardware for the MVP. Do not add Kubernetes, microservices, a second broker, vector retrieval, rolling-summary replacement, arbitrary provider switching, or an extra AI proxy until a measured failure proves that the simpler architecture cannot meet an approved requirement.

The strongest long-term asset is not a particular model. It is the combination of the evaluation corpus, explicit domain contracts, immutable lineage, provider capability tests, cost telemetry, and controlled activation history. Those assets allow Mahalla Ovozi to adopt better or cheaper models without relearning its product semantics.

## 9. Implementation Roadmap and Risk Assessment

The detailed roadmap earlier in this report remains authoritative. Its sequence is:

1. Decisions, schemas, evaluation foundation, and cost calculator.
2. Durable Telegram intake and fake-provider infrastructure tests.
3. Deterministic evidence snapshots, operation state machine, gateway, and lineage.
4. Local adapter and documented development workflow.
5. One hosted candidate adapter with privacy envelope, usage ledger, and budgets.
6. End-to-end product analysis slice and authorized dashboard.
7. Production hardening, recovery drills, load tests, and bounded pilot.

The five unresolved feasibility gates are:

- representative local-language semantic quality;
- same-day context growth and overflow;
- hosted processing/retention eligibility;
- real account quotas, latency, and provider failure behavior;
- measured monthly cost at the design envelope.

A single-host pilot also retains a known availability risk. Before production, define RPO/RTO, automate off-host backups, complete a clean-environment restore drill, and document rebuild and provider-outage procedures.

## 10. Future Technical Outlook and Innovation Opportunities

Near-term evolution should focus on improving evaluations, cost measurement, profile governance, and provider resilience—not expanding infrastructure. A second hosted adapter becomes worthwhile only if it supplies a validated privacy, price, quality, availability, or negotiation advantage.

Medium-term options include a managed PostgreSQL service, a separate worker host, or self-hosted inference if real measurements justify them. These are migration paths already supported by the gateway and runtime-role boundaries; they are not MVP prerequisites.

Long-term model improvements may reduce inference cost and improve Uzbek/Russian performance, but they also increase catalog volatility. Scheduled reevaluation and pinned AI Profiles are therefore durable requirements even if the preferred provider changes.

## 11. Technical Research Methodology and Source Verification

The research prioritized official documentation for version-sensitive facts, supported architecture choices with established security and reliability guidance, and reconciled those sources against the locked Forge product model. Search topics included provider pricing and model snapshots, context and structured-output capabilities, rate limits, retention/ZDR, caching, local OpenAI compatibility, Node.js support status, PostgreSQL-backed queues, deployment, testing, observability, and threat controls.

Confidence levels:

| Area | Confidence | Reason |
|---|---|---|
| Hosted-first/provider-neutral direction | High | Directly addresses hardware, cost, maintainability, and vendor-risk constraints |
| Gateway, profiles, modular monolith, queue | High | Stable architectural boundaries with explicit failure handling |
| Node/PostgreSQL/TypeScript application stack | High | Mature supported ecosystem suitable for the workload |
| pg-boss and single-server Compose pilot | Medium | Plausible but requires production-shaped crash/load/recovery tests |
| Final model/provider and caching policy | Low until evaluation | Quality, privacy, quota, and cost are account- and workload-specific |
| Monthly cost and end-to-end latency | Low until benchmark | Same-day token distributions and provider behavior have not been measured |

All provider prices, model names, quotas, retention terms, and regional features are time-sensitive. Revalidate them when Architecture selects a candidate, before every production profile approval, and whenever provider terms or observed billing change.

## 12. Technical Appendices and Decision Gates

### Required PRD and Architecture Decisions

- Approved semantic metrics and thresholds for triage, Topics, attribution, and summaries.
- Maximum acceptable false-negative and material-summary-error rates.
- Monthly AI budget, per-operation limits, hard stop, and authorized override.
- Approved provider, model snapshot, retention/ZDR configuration, data location, and customer disclosure.
- Exact interpretation of normal and burst latency targets.
- RPO, RTO, acceptable pilot availability, and expansion trigger.
- Product response when exact same-day context exceeds an approved model or budget.

### Production Profile Activation Checklist

- Provider adapter contract and capability tests pass.
- Representative evaluation corpus passes the approved thresholds.
- Context/token distribution and monthly scenario are measured and approved.
- Privacy, retention, caching, location, credentials, and logging controls are approved.
- Real-tier quota, rate-limit, timeout, refusal, invalid-schema, and outage tests pass.
- Cost budgets, alerts, kill switch, rollback, audit, backup, and restore evidence exist.
- Activation names the actor, reason, old profile, new profile, and future-only effective point.

## Technical Research Conclusion

Mahalla Ovozi can reach production without a local GPU server. The technically sound path is a private, durable application core with hosted-first inference, local development inference, one owned gateway, tested adapters, immutable profiles, and explicit human approval gates. This gives the project practical affordability today without surrendering future provider choice.

The research does not declare a winning model. It defines the architecture and evidence needed to choose one safely. The next planning phase should carry these invariants into the PRD and Architecture, then implementation should prove them through a fake-provider spine, a locked evaluation corpus, one local adapter, one hosted candidate, production-shaped tests, and a bounded district pilot.

**Technical Research Completion Date:** 2026-07-30

---

## 13. Operational Baseline Addendum (2026-08-31)

### Validated Operational Model Selection: Ollama `gemma4:12b`

Following end-to-end integration and verification against live Telegram municipal data:
1. **Selected Model:** `gemma4:12b` via local Ollama runtime. It demonstrated superior performance in understanding colloquial Uzbek (Latin & Cyrillic), Russian loan words, and nuanced municipal complaints compared to earlier baselines.
2. **Phased Deployment Topology:**
   - *Development & MVP Testing:* Local host serving as application node, PostgreSQL database, and Ollama inference node.
   - *Commercial Production Deployment:* Commercial reliable VPS in Uzbekistan (e.g., aHOST / UzCloud within TAS-IX) ensuring 24/7 uptime/power SLA, static public IP, full national data sovereignty, and automated daily database backups.
3. **Latency & Execution Optimization:**
   - Chain-of-Thought thinking was disabled (`think: false`) in request payloads, reducing latency to <3 seconds per structured evaluation.
   - VRAM persistence was enabled (`keep_alive: -1`) to keep `gemma4:12b` permanently loaded in GPU memory, eliminating cold-start delays.
4. **Domain Rule Calibration:** The `DIRECT OUTAGE REPORT RULE` was validated to ensure 2-3 word outage reports (e.g., "suv yo'q", "svet o'chdi") are classified as genuine civic evidence rather than dropped as ambiguous fragments.
5. **Architectural Compliance:** The implementation strictly adheres to AD-8 (Provider-neutral AI gateway with immutable versioned `ai_profiles`), preserving full portability between local and hosted cloud providers as scaling needs evolve.

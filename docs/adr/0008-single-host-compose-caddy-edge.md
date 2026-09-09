---
status: accepted
date: 2026-08-12
---

# Single-Host Docker Compose Deployment with Caddy Edge

Production is deployed on a single dedicated Linux host using Docker Compose, hosted on a domestic VPS provider (Airnet.uz on Ubuntu 24.04 LTS at the BKM datacenter in Tashkent). Caddy 2.x serves as the public edge server handling automatic HTTPS, static SPA hosting, and API/webhook reverse proxying. Disaster recovery is managed via pgBackRest continuous WAL archiving to an offsite S3-compatible store.

## Considered Options

- **Kubernetes / Nomad Orchestration:** Rejected due to extreme infrastructure overhead, operational burden, and maintenance cost for a single-operator startup.
- **Foreign Serverless / Managed Cloud PaaS (Vercel/Fly.io/AWS ECS/Hetzner):** Rejected due to high egress costs, foreign currency dependencies, and strict local compliance/sovereignty requirements that mandate municipal resident data remain within Uzbekistan's national network perimeter (TAS-IX/UZ-IX).

## Consequences

- The entire stack (Caddy, Fastify API, worker runtime, PostgreSQL) is defined in a transparent `docker-compose.yml` and runs directly on the Ubuntu 24.04 Airnet.uz VPS with low domestic latency.
- Internal service ports (PostgreSQL, worker) remain private and unexposed to the public internet.
- Single-host downtime during host upgrades or hardware maintenance is an accepted MVP trade-off, mitigated by scheduled pgBackRest backup restore drills (RPO ≤ 1h, RTO ≤ 8h).

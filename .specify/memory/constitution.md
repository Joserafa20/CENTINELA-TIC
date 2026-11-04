# CENTINELA TIC — Project Constitution

## Identity

**Product:** CENTINELA TIC  
**Version:** 1.0.0  
**Purpose:** Local cybersecurity analysis platform for the TIC Coordination Unit  
**Deployment:** Windows 11, fully local, Docker-based  
**Primary user:** Administrator analyst  

## Mission

Provide a professional, secure, and auditable toolset for analyzing suspicious emails, files, URLs, and domains — generating technical reports suitable for institutional documentation.

## Non-Negotiable Principles

1. **Security by design** — every component is designed with threat modelling first.
2. **No invented results** — the system never fabricates analysis output. If a check cannot run, it reports `INCONCLUSIVE`, not a result.
3. **No automatic execution** — files extracted from archives are never executed under any circumstance.
4. **Isolation** — analyzers run in sandboxed containers with resource limits, no host filesystem access, no privileged mode.
5. **Local-first** — all core functions operate without internet access. External integrations are optional enrichment.
6. **Auditability** — every analysis action is logged with timestamp, actor, input hash, and result.
7. **Honest uncertainty** — the system distinguishes confirmed threats, suspicious indicators, clean results, incomplete analysis, and unsupported formats. These are never collapsed into a binary safe/unsafe output.

## What CENTINELA TIC Must Never Do

- Execute any extracted or uploaded file.
- Navigate to suspicious URLs automatically.
- Download remote content without explicit analyst authorization.
- Upload institutional samples to external services without explicit authorization per-sample.
- Store passwords or secrets in plaintext in the database.
- Report a file as safe solely because no detections were found (absence of evidence ≠ evidence of absence).
- Report a domain or email as legitimate solely because SPF/DKIM/DMARC pass.
- Expose the database, Redis, or internal services on non-localhost interfaces.

## Technical Constraints

- Node.js 24 / TypeScript strict mode across all layers.
- NestJS for backend API.
- Next.js 15 for frontend.
- PostgreSQL + Prisma ORM.
- Redis + BullMQ for job queues.
- Docker Compose for all infrastructure.
- ClamAV + YARA for file scanning.
- All containers run as non-root users with CPU/memory/time limits.

## Decision Authority

All architectural decisions must be recorded in `docs/DECISION_LOG.md` with rationale and alternatives considered.

## Definition of Done (Global)

A feature is DONE when:
1. Implementation matches the spec.
2. Unit tests pass.
3. Integration tests pass.
4. TypeScript compiles without errors.
5. ESLint passes.
6. All acceptance criteria are verified.
7. Documentation is updated.
8. The task is marked VALIDATED in TASKS.md.

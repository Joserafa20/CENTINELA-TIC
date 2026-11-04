# CENTINELA TIC — Roadmap

**Version:** 1.0.0  
**Date:** 2026-11-04

---

## Phase Overview

| Phase | Name | Status | Description |
|-------|------|--------|-------------|
| 0 | Discovery & Specs | ✅ IN PROGRESS | Environment check, SDD documentation, all module specs |
| 1 | Infrastructure | ✅ COMPLETE | Docker Compose, PostgreSQL, Redis, NestJS base, Next.js base, health check |
| 2 | Design & Dashboard | ⏳ PENDING | Visual identity, navigation, dashboard with real data, dark/light mode |
| 3 | Email Analyzer | ⏳ PENDING | EML/MSG/TXT parser, header extraction, auth analysis, risk scoring |
| 4 | File Analyzer | ⏳ PENDING | ClamAV, YARA, SHA-256, PDF/Office/ZIP inspection, isolated container |
| 5 | Email Verifier | ⏳ PENDING | DNS/MX/SPF/DMARC/DKIM validation, disposable domain detection |
| 6 | URL Analyzer | ⏳ PENDING | URL parsing, TLS check, reputation, SSRF controls |
| 7 | Threat Intelligence | ⏳ PENDING | VirusTotal, URLhaus, GSB integrations, caching, rate limiting |
| 8 | Reports & History | ⏳ PENDING | PDF generation, history view, filters, export, evidence management |
| 9 | Hardening & Delivery | ⏳ PENDING | Security audit, full test suite, scripts, manuals, backup/restore |

---

## Phase 0 — Discovery & Specs (Current)

### Environment
- [x] Node.js 24.15.0 ✓
- [x] npm 12.0.2 ✓
- [x] Docker 29.9.2 ✓
- [x] Docker Compose v5.6.1 ✓
- [x] WSL2 Ubuntu ✓
- [x] Git 2.54.0 ✓

### SDD Documentation
- [x] Project constitution
- [x] Architecture document
- [x] Conventions
- [x] PRD
- [x] Security policy
- [ ] Module specs (001–009)
- [ ] TASKS.md initial population
- [ ] DECISION_LOG.md
- [ ] QUALITY_GATE.md
- [ ] CHANGELOG.md

---

## Phase 1 — Infrastructure Targets

- Docker Compose with PostgreSQL, Redis, backend, frontend, scanner services.
- NestJS project scaffolded, compiles, health endpoint responds.
- Next.js 15 project scaffolded, compiles, renders a placeholder page.
- Prisma schema initial migration applied.
- Swagger available at `/api/docs`.
- All services start with `docker compose up`.

---

## Phase 9 — Exit Criteria (Final)

All 20 items from Section 13 of the SDD Maestro verified and recorded in QUALITY_GATE.md.

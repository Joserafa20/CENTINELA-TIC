# CENTINELA TIC — Task Tracker

**Last updated:** 2026-11-04  
**Methodology:** Sequential phases; a task is COMPLETADA only when implemented AND tested AND criteria verified.

---

## Status Legend

| Status | Meaning |
|--------|---------|
| PENDIENTE | Not started |
| EN PROGRESO | Currently being worked on |
| BLOQUEADA | Cannot proceed — blocker documented |
| COMPLETADA | Implemented + tests passing |
| VALIDADA | All acceptance criteria verified |

---

## FASE 0 — Discovery & Specifications

| ID | Task | Priority | Deps | Status |
|----|------|----------|------|--------|
| TASK-F0-001 | Inspect environment (Node, npm, Docker, WSL2, Git) | Critical | — | VALIDADA |
| TASK-F0-002 | Create SDD directory structure | Critical | F0-001 | VALIDADA |
| TASK-F0-003 | Write project constitution | Critical | F0-002 | VALIDADA |
| TASK-F0-004 | Write architecture document | Critical | F0-002 | VALIDADA |
| TASK-F0-005 | Write conventions document | Critical | F0-002 | VALIDADA |
| TASK-F0-006 | Write PRD | Critical | F0-002 | VALIDADA |
| TASK-F0-007 | Write security policy | Critical | F0-002 | VALIDADA |
| TASK-F0-008 | Write ROADMAP.md | High | F0-002 | VALIDADA |
| TASK-F0-009 | Write DECISION_LOG.md (DEC-001 to DEC-005) | High | F0-002 | VALIDADA |
| TASK-F0-010 | Write QUALITY_GATE.md | High | F0-002 | VALIDADA |
| TASK-F0-011 | Write SPEC-001 (Foundation) | Critical | F0-002 | VALIDADA |
| TASK-F0-012 | Write SPEC-002 (Dashboard) | Critical | F0-002 | VALIDADA |
| TASK-F0-013 | Write SPEC-003 (Email Analyzer) | Critical | F0-002 | VALIDADA |
| TASK-F0-014 | Write SPEC-004 (File Analyzer) | Critical | F0-002 | VALIDADA |
| TASK-F0-015 | Write SPEC-005 (Email Verifier) | High | F0-002 | VALIDADA |
| TASK-F0-016 | Write SPEC-006 (URL Analyzer) | High | F0-002 | VALIDADA |
| TASK-F0-017 | Write SPEC-007 (Threat Intelligence) | High | F0-002 | VALIDADA |
| TASK-F0-018 | Write SPEC-008 (Reports & History) | High | F0-002 | VALIDADA |
| TASK-F0-019 | Write SPEC-009 (Security & Audit) | High | F0-002 | VALIDADA |
| TASK-F0-020 | Write TASKS.md | High | F0-002 | VALIDADA |
| TASK-F0-021 | Write SESSION.md | High | F0-002 | COMPLETADA |
| TASK-F0-022 | Write docker-compose.yml scaffold | High | F0-002 | PENDIENTE |
| TASK-F0-023 | Write .env.example | High | F0-002 | PENDIENTE |
| TASK-F0-024 | Write README.md | High | F0-002 | PENDIENTE |
| TASK-F0-025 | Write START.md | High | F0-002 | PENDIENTE |
| TASK-F0-026 | Push FASE 0 to GitHub | High | All F0 | PENDIENTE |

---

## FASE 1 — Infrastructure

| ID | Task | Priority | Deps | Status | AC |
|----|------|----------|------|--------|-----|
| TASK-001 | Create docker-compose.yml (all services) | Critical | F0 done | PENDIENTE | AC-FOUND-001 |
| TASK-002 | Scaffold NestJS backend | Critical | TASK-001 | PENDIENTE | AC-FOUND-007 |
| TASK-003 | Configure Prisma + base schema | Critical | TASK-002 | PENDIENTE | AC-FOUND-008 |
| TASK-004 | Implement health module | High | TASK-003 | PENDIENTE | AC-FOUND-002 |
| TASK-005 | Implement auth module (JWT, bcrypt) | Critical | TASK-003 | PENDIENTE | AC-FOUND-005/006 |
| TASK-006 | Configure global exception filter | High | TASK-002 | PENDIENTE | — |
| TASK-007 | Configure Swagger | High | TASK-002 | PENDIENTE | AC-FOUND-004 |
| TASK-008 | Configure pino logging | High | TASK-002 | PENDIENTE | — |
| TASK-009 | Configure BullMQ module | High | TASK-002 | PENDIENTE | — |
| TASK-010 | Scaffold Next.js 15 frontend | Critical | TASK-001 | PENDIENTE | AC-FOUND-003 |
| TASK-011 | Install shadcn/ui + Tailwind | High | TASK-010 | PENDIENTE | — |
| TASK-012 | Create base layout (sidebar + main) | High | TASK-011 | PENDIENTE | AC-FOUND-003 |
| TASK-013 | Create .env.example | High | TASK-001 | PENDIENTE | — |
| TASK-014 | Create START.md | High | TASK-001 | PENDIENTE | — |
| TASK-015 | Write auth unit tests | High | TASK-005 | PENDIENTE | TEST-FOUND-003/004/005/006 |
| TASK-016 | Write health integration test | High | TASK-004 | PENDIENTE | TEST-FOUND-001/002 |

---

## FASE 2 — Dashboard

| ID | Task | Priority | Deps | Status |
|----|------|----------|------|--------|
| TASK-020 | Dashboard stats endpoint | High | FASE 1 | PENDIENTE |
| TASK-021 | Activity timeline query | High | TASK-020 | PENDIENTE |
| TASK-022 | Dashboard Next.js page | High | TASK-020 | PENDIENTE |
| TASK-023 | KPI stat tile component | High | TASK-022 | PENDIENTE |
| TASK-024 | Threat distribution chart (Recharts) | High | TASK-022 | PENDIENTE |
| TASK-025 | Activity chart (Recharts) | High | TASK-022 | PENDIENTE |
| TASK-026 | Recent analyses table (TanStack Table) | High | TASK-022 | PENDIENTE |
| TASK-027 | Dark/light mode (next-themes) | Medium | TASK-011 | PENDIENTE |
| TASK-028 | Dashboard API tests | High | TASK-020 | PENDIENTE |
| TASK-029 | Dashboard component tests | High | TASK-023 | PENDIENTE |

---

## FASE 3 — Email Analyzer

| ID | Task | Priority | Deps | Status |
|----|------|----------|------|--------|
| TASK-030 | Install mailparser | Critical | FASE 1 | PENDIENTE |
| TASK-031 | Email analysis NestJS module | Critical | TASK-030 | PENDIENTE |
| TASK-032 | File upload endpoint + validation | Critical | TASK-031 | PENDIENTE |
| TASK-033 | MIME parser service | Critical | TASK-032 | PENDIENTE |
| TASK-034 | Header extraction service | Critical | TASK-033 | PENDIENTE |
| TASK-035 | Authentication analysis service | Critical | TASK-034 | PENDIENTE |
| TASK-036 | URL extractor service | High | TASK-033 | PENDIENTE |
| TASK-037 | Attachment identifier service | High | TASK-033 | PENDIENTE |
| TASK-038 | Phishing indicator detector | High | TASK-034 | PENDIENTE |
| TASK-039 | Risk classification engine | Critical | TASK-035/038 | PENDIENTE |
| TASK-040 | Prisma EmailAnalysis model | High | TASK-003 | PENDIENTE |
| TASK-041 | Analysis result GET endpoint | High | TASK-039 | PENDIENTE |
| TASK-042 | Frontend email upload page | High | TASK-041 | PENDIENTE |
| TASK-043 | Frontend results display | High | TASK-042 | PENDIENTE |
| TASK-044 | EML test fixtures | High | — | PENDIENTE |
| TASK-045 | Email unit tests | Critical | TASK-039 | PENDIENTE |
| TASK-046 | Email integration tests | Critical | TASK-041 | PENDIENTE |

---

## FASE 4 — File Analyzer

*(TASK-050 through TASK-064 — see SPEC-004)*

---

## FASE 5 — Email Verifier

*(TASK-070 through TASK-080 — see SPEC-005)*

---

## FASE 6 — URL Analyzer

*(TASK-085 through TASK-097 — see SPEC-006)*

---

## FASE 7 — Threat Intelligence

*(TASK-100 through TASK-111 — see SPEC-007)*

---

## FASE 8 — Reports & History

*(TASK-115 through TASK-123 — see SPEC-008)*

---

## FASE 9 — Configuration & Hardening

*(TASK-130 through TASK-139 — see SPEC-009)*  
*(Plus: full E2E tests, security audit, scripts, manuals)*

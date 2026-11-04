# CENTINELA TIC — Architecture Document

**Version:** 1.0.0  
**Date:** 2026-11-04

> See `.specify/memory/architecture.md` for the diagram reference. This document elaborates decisions and rationale.

---

## 1. Architecture Style

**Modular Monolith** (backend) + **Microfrontend-ready** (frontend by route segments).

Rationale: A distributed microservices architecture is overengineered for a single-user local tool. A modular monolith provides clean separation of concerns while keeping operational complexity low. The module boundaries are drawn such that future extraction to separate services is possible.

---

## 2. Technology Decisions

### 2.1 Backend: NestJS

- **Why:** TypeScript-native, opinionated module structure, built-in DI, Swagger support, BullMQ integration, strong ecosystem.
- **Alternative considered:** Express + custom structure — rejected due to lack of enforced conventions.

### 2.2 Frontend: Next.js 15

- **Why:** App Router for layouts, Server Components for static pages, Client Components for interactive analysis UIs. TypeScript first-class.
- **Alternative considered:** Vite + React SPA — rejected because Next.js provides better structure and routing.

### 2.3 Database: PostgreSQL + Prisma

- **Why:** Relational data with complex queries (analysis history, filters). Prisma provides type-safe queries and migrations.
- **Alternative considered:** SQLite — rejected due to concurrent write limitations with BullMQ workers.

### 2.4 Queue: BullMQ + Redis

- **Why:** File and email analysis are CPU-intensive. Offloading to a queue prevents API timeouts and allows retries.
- **Alternative considered:** Direct synchronous processing — rejected; blocks API for large files.

### 2.5 Scanner: Isolated Container

- **Why:** ClamAV and YARA run in a separate container with no network access, tmpfs scratch space, and resource limits. This provides process isolation without VM overhead.

---

## 3. Data Model (High Level)

```
Analysis
  id            UUID PK
  type          ENUM (EMAIL | FILE | URL | EMAIL_VERIFY)
  status        ENUM (PENDING | PROCESSING | COMPLETED | FAILED)
  inputHash     VARCHAR (SHA-256 of input)
  inputName     VARCHAR
  riskLevel     ENUM (CRITICAL | HIGH | MEDIUM | LOW | CLEAN | INCONCLUSIVE)
  createdAt     TIMESTAMP
  completedAt   TIMESTAMP
  createdBy     FK → User

EmailAnalysis
  id            UUID PK
  analysisId    FK → Analysis
  rawHeaders    JSONB
  fromAddress   VARCHAR
  subject       VARCHAR
  spfResult     VARCHAR
  dkimResult    VARCHAR
  dmarcResult   VARCHAR
  arcResult     VARCHAR
  urls          JSONB[]
  attachments   JSONB[]
  indicators    JSONB[]

FileAnalysis
  id            UUID PK
  analysisId    FK → Analysis
  sha256        VARCHAR
  fileType      VARCHAR
  clamResult    JSONB
  yaraMatches   JSONB[]
  metadata      JSONB
  indicators    JSONB[]

UrlAnalysis
  id            UUID PK
  analysisId    FK → Analysis
  url           TEXT
  domain        VARCHAR
  ipAddresses   JSONB[]
  tlsCert       JSONB
  redirectChain JSONB[]
  indicators    JSONB[]

ThreatIntelQuery
  id            UUID PK
  analysisId    FK → Analysis (nullable)
  provider      VARCHAR
  indicator     TEXT
  indicatorType ENUM (HASH | DOMAIN | IP | URL)
  result        JSONB
  queriedAt     TIMESTAMP

AuditLog
  id            UUID PK
  userId        FK → User
  action        VARCHAR
  resource      VARCHAR
  resourceId    VARCHAR
  metadata      JSONB
  createdAt     TIMESTAMP

User
  id            UUID PK
  email         VARCHAR UNIQUE
  passwordHash  VARCHAR
  role          ENUM (ADMIN)
  createdAt     TIMESTAMP
```

---

## 4. Security Architecture

| Layer | Control |
|-------|---------|
| Upload | Magic byte validation, extension whitelist, size limit, virus pre-check |
| Storage | Outside web root, hash-based filenames, temp files cleaned after analysis |
| Container | Non-root, no new privileges, CPU/mem limits, no network (scanner) |
| API | JWT auth, CORS localhost-only, rate limiting, input validation (Zod + class-validator) |
| Database | Not exposed outside Docker network, parameterized queries via Prisma |
| Secrets | .env files, never committed. API keys encrypted at rest in DB |
| Audit | Every analysis action logged with userId, inputHash, timestamp |

---

## 5. Deployment

Single `docker-compose.yml` starts all services. A `START.md` and `scripts/start.ps1` provide one-command startup.

Ports bound to `127.0.0.1` only — not `0.0.0.0`.

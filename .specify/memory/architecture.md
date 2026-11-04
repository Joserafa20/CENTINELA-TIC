# CENTINELA TIC — Architecture

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (localhost)                   │
│                   Next.js 15 Frontend                   │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP REST / JSON
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  NestJS Backend API                     │
│              /api/v1  —  port 3001                      │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│   │  Email   │ │  File    │ │  URL     │ │ Threat   │ │
│   │ Module   │ │ Module   │ │ Module   │ │  Intel   │ │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│        └────────────┴────────────┴─────────────┘       │
│                       │ BullMQ Jobs                     │
└───────────────────────┼─────────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  PostgreSQL  │ │    Redis     │ │   Scanner    │
│  (port 5432) │ │  (port 6379) │ │  Container   │
│   Prisma ORM │ │   BullMQ     │ │  ClamAV+YARA │
└──────────────┘ └──────────────┘ └──────────────┘
```

## Service Ports (localhost only)

| Service | Port | Notes |
|---------|------|-------|
| Frontend | 3000 | Next.js dev server |
| Backend API | 3001 | NestJS |
| PostgreSQL | 5432 | Internal only |
| Redis | 6379 | Internal only |
| Swagger UI | 3001/api/docs | Development only |

## Data Flow — File Analysis

```
User uploads file
      │
      ▼
Backend validates (magic bytes, size, extension whitelist)
      │
      ▼
File stored in isolated temp volume (hash-named)
      │
      ▼
Analysis job queued in BullMQ
      │
      ▼
Scanner container picks up job
  ├── SHA-256 hash
  ├── File type identification (libmagic)
  ├── ClamAV scan
  ├── YARA rules
  ├── Type-specific analysis (PDF/Office/ZIP/Script)
  └── Results assembled
      │
      ▼
Results written to PostgreSQL
      │
      ▼
Frontend polls job status → displays results
```

## Data Flow — Email Analysis

```
User uploads EML/MSG/TXT
      │
      ▼
Backend validates file
      │
      ▼
MIME parser extracts structure
  ├── Headers (From, To, CC, BCC, Reply-To, Return-Path, etc.)
  ├── Authentication headers (Received-SPF, DKIM-Signature, etc.)
  ├── Body (plain + HTML)
  ├── Attachments (queued for file analysis)
  └── Embedded URLs
      │
      ▼
Authentication analysis (SPF, DKIM, DMARC, ARC)
      │
      ▼
Risk scoring engine applies rules
      │
      ▼
Results persisted + returned to frontend
```

## Security Architecture

- All containers: non-root, read-only filesystem where possible, no new privileges.
- Scanner container: no network access, tmpfs for extracted files.
- Backend: input validation on every endpoint, rate limiting, CORS restricted to localhost.
- Database: not exposed outside Docker network.
- File storage: outside web root, accessed only by backend service account.
- External API calls: isolated `threat-intel` service, receives only normalized indicators.

## Module Boundaries

```
frontend/           — Next.js app (UI only, no business logic)
backend/            — NestJS API (orchestration, persistence, job dispatch)
  src/
    modules/
      auth/
      analysis/
      email/
      files/
      url/
      email-verifier/
      threat-intel/
      reports/
      history/
      config/
      audit/
    common/
      filters/
      guards/
      pipes/
      dto/
scanner/            — Python/Node scanner workers (ClamAV, YARA, parsers)
infrastructure/     — Docker configs, Nginx (if needed)
scripts/            — start, stop, backup, restore
tests/              — E2E and integration test suites
```
